/**
 * Real-Time Communication & Announcements Module for Pure Max Factory
 * Supports 1-to-1 chat, group channels, Manager announcements broadcast,
 * voice note recording with MediaRecorder API, image uploads, and WebRTC Call UI.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { socketService } from '../../services/socketService';
import { soundEffects } from '../../utils/audioChime';
import { requestCameraAccess, captureFrameFromVideo } from '../../utils/mediaPermissions';
import { compressImage } from '../../utils/imageCompressor';
import { idbStorage } from '../../utils/indexedDBStorage';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import {
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Image as ImageIcon,
  Camera,
  Phone,
  Video,
  Megaphone,
  Volume2,
  PhoneOff,
  User,
  Sparkles,
  Paperclip,
  CheckCheck,
  ShieldCheck,
  KeyRound,
  Mail,
  Smartphone,
  Lock,
  RefreshCw,
  Search,
  Square,
  Play,
  Pause,
  ArrowLeft,
  Edit2,
  Trash2,
  Check,
  X,
} from 'lucide-react';

export const ChatModule: React.FC = () => {
  const {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    announcements,
    postAnnouncement,
    users,
    currentUser,
    activeRole,
    markChannelMessagesAsRead,
  } = useApp();

  const [activeChannel, setActiveChannel] = useState<'broadcast' | 'announcements' | string>('broadcast');
  const [mobileChatView, setMobileChatView] = useState<'list' | 'chat'>('list');
  const [inputText, setInputText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Edit & Delete state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInputText, setEditInputText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Real MediaRecorder Voice Note recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Announcement modal state
  const [showAncModal, setShowAncModal] = useState(false);
  const [ancTitle, setAncTitle] = useState('');
  const [ancContent, setAncContent] = useState('');
  const [ancPriority, setAncPriority] = useState<'normal' | 'urgent'>('normal');

  // Camera Snapshot State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const chatVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatCameraStreamRef = useRef<MediaStream | null>(null);

  const startChatCamera = async () => {
    setCameraError(null);
    const { stream, error } = await requestCameraAccess();
    if (error || !stream) {
      setCameraError(error || 'Failed to initialize device camera.');
      alert(error || 'Camera access is required to take live photos.');
      return;
    }
    chatCameraStreamRef.current = stream;
    setIsCameraActive(true);
    setTimeout(() => {
      if (chatVideoRef.current) {
        chatVideoRef.current.srcObject = stream;
      }
    }, 100);
  };

  const stopChatCamera = () => {
    if (chatCameraStreamRef.current) {
      chatCameraStreamRef.current.getTracks().forEach((track) => track.stop());
      chatCameraStreamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const handleCaptureAndSendPhoto = () => {
    if (!chatVideoRef.current) return;
    const snap = captureFrameFromVideo(chatVideoRef.current);
    if (snap) {
      const isDirect = activeChannel !== 'broadcast' && activeChannel !== 'announcements';
      sendMessage({
        groupId: isDirect ? undefined : 'all-staff',
        recipientId: isDirect ? activeChannel : undefined,
        type: 'image',
        content: snap,
      });
      socketService.emitChatMessage({
        senderId: currentUser?.id,
        senderName: currentUser?.name,
        senderRole: currentUser?.role,
        recipientId: isDirect ? activeChannel : undefined,
        groupId: isDirect ? undefined : 'all-staff',
        type: 'image',
        content: snap,
        timestamp: new Date().toISOString(),
      });
      soundEffects.playMessageChime();
      stopChatCamera();
    }
  };

  useEffect(() => {
    return () => {
      if (chatCameraStreamRef.current) {
        chatCameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleOpenWhatsApp = (targetUser: any) => {
    if (!targetUser) return;
    const rawPhone = targetUser.phone || '';
    const cleanPhone = rawPhone.replace(/[^\d]/g, '');
    const greeting = `Hello ${targetUser.name}, this is ${currentUser?.name || 'CEO'} (${currentUser?.role || 'Executive'}) from Pure Max Factory OS:`;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`
      : `https://wa.me/?text=${encodeURIComponent(greeting)}`;
    window.open(url, '_blank');
  };

  // Restrict announcement creation rights to Developer, Manager, Production Engineer, and Sales Production Officer
  const canPostAnnounce = ['developer', 'manager', 'second_manager', 'engineer', 'sales_manager'].includes(activeRole);

  const prevMessageCountRef = useRef(messages.length);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [idbAvatars, setIdbAvatars] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load all user avatars from IndexedDB instantly to avoid loading spinners or missing images
    const loadIdbAvatars = async () => {
      const avatarsMap: Record<string, string> = {};
      for (const u of users) {
        if (u.employeeId) {
          const cached = await idbStorage.getMediaItem(`user_avatar_${u.employeeId}`);
          if (cached) avatarsMap[u.id] = cached;
        }
      }
      setIdbAvatars(avatarsMap);
    };
    loadIdbAvatars();
  }, [users]);

  // Mark channel messages as read on open or new incoming
  useEffect(() => {
    if (activeChannel && currentUser) {
      markChannelMessagesAsRead(activeChannel);
    }
  }, [activeChannel, messages.length, currentUser]);

  // Incoming DM chime audio notification
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const latestMsg = messages[messages.length - 1];
      if (latestMsg && latestMsg.senderId !== currentUser?.id && latestMsg.receiverId === currentUser?.id) {
        soundEffects.playMessageChime();
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, currentUser?.id]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel]);

  // Strict Privacy Filtering for Direct Messages & Broadcasts:
  // - Broadcast channel: all-staff group messages ONLY (no receiverId)
  // - 1-to-1 DM channel: visible ONLY to sender and designated recipient
  const visibleMessages = messages.filter((m) => {
    if (!currentUser) return false;

    if (activeChannel === 'broadcast') {
      return !m.receiverId && (m.groupId === 'all-staff' || !m.groupId);
    }

    if (activeChannel === 'announcements') {
      return false;
    }

    // Direct Message 1-to-1: strictly between currentUser and activeChannel
    return (
      (m.senderId === currentUser.id && m.receiverId === activeChannel) ||
      (m.senderId === activeChannel && m.receiverId === currentUser.id)
    );
  });

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const isDirect = activeChannel !== 'broadcast' && activeChannel !== 'announcements';

    sendMessage({
      groupId: isDirect ? undefined : 'all-staff',
      recipientId: isDirect ? activeChannel : undefined,
      type: 'text',
      content: inputText,
    });

    socketService.emitChatMessage({
      senderId: currentUser?.id,
      senderName: currentUser?.name,
      senderRole: currentUser?.role,
      recipientId: isDirect ? activeChannel : undefined,
      groupId: isDirect ? undefined : 'all-staff',
      type: 'text',
      content: inputText,
      timestamp: new Date().toISOString(),
    });

    soundEffects.playMessageChime();
    setInputText('');
  };

  const handleStartEdit = (msg: { id: string; content: string }) => {
    setEditingMessageId(msg.id);
    setEditInputText(msg.content);
    setConfirmDeleteId(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditInputText('');
  };

  const handleSaveEdit = (messageId: string) => {
    if (!editInputText.trim()) return;
    editMessage(messageId, editInputText.trim());
    setEditingMessageId(null);
    setEditInputText('');
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessage(messageId);
    setConfirmDeleteId(null);
    if (editingMessageId === messageId) {
      setEditingMessageId(null);
      setEditInputText('');
    }
  };

  // Real Human Voice Note recording using MediaRecorder with optimal voice filters
  const startVoiceRecording = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        // Some low-end Android handsets and locked-down browsers reject the
        // full voice-processing constraint block with OverconstrainedError
        // (or NotReadableError when another app holds the mic). Previously a
        // single all-or-nothing attempt meant those devices simply could not
        // record voice notes at all. Fall back to progressively plainer
        // constraints before giving up.
        const constraintLadder: MediaStreamConstraints[] = [
          { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } },
          { audio: { echoCancellation: true } },
          { audio: true },
        ];

        let stream: MediaStream | null = null;
        let lastErr: unknown = null;

        for (const constraints of constraintLadder) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (stream && stream.getAudioTracks().length > 0) break;
            stream?.getTracks().forEach((t) => t.stop());
            stream = null;
          } catch (err) {
            lastErr = err;
          }
        }

        if (!stream) throw lastErr ?? new Error('No microphone available');

        // Determine best supported high-fidelity audio MIME type
        const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/aac'];
        let selectedMime = '';
        if (typeof MediaRecorder !== 'undefined') {
          for (const cand of candidates) {
            if (MediaRecorder.isTypeSupported(cand)) {
              selectedMime = cand;
              break;
            }
          }
        }

        const options: MediaRecorderOptions = selectedMime ? { mimeType: selectedMime } : {};
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const finalMime = mediaRecorder.mimeType || selectedMime || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
          
          if (audioBlob.size > 0) {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
              const base64Audio = reader.result as string;
              const isDirect = activeChannel !== 'broadcast' && activeChannel !== 'announcements';
              const dur = Math.max(1, recordingSecondsRef.current || recordingSeconds || 2);
              sendMessage({
                groupId: isDirect ? undefined : 'all-staff',
                recipientId: isDirect ? activeChannel : undefined,
                type: 'voice',
                content: base64Audio,
                durationSeconds: dur,
              });
              socketService.emitChatMessage({
                senderId: currentUser?.id,
                senderName: currentUser?.name,
                senderRole: currentUser?.role,
                recipientId: isDirect ? activeChannel : undefined,
                groupId: isDirect ? undefined : 'all-staff',
                type: 'voice',
                content: base64Audio,
                durationSeconds: dur,
                timestamp: new Date().toISOString(),
              });
              soundEffects.playMessageChime();
            };
          }
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start(200); // Collect slice every 200ms
        setIsRecording(true);
        setRecordingSeconds(0);
        recordingSecondsRef.current = 0;
        timerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => {
            const next = prev + 1;
            recordingSecondsRef.current = next;
            return next;
          });
        }, 1000);
      } else {
        alert('Microphone access is not supported on this browser/environment.');
      }
    } catch (e: any) {
      console.warn('Microphone permission request was blocked or not allowed:', e);
      alert('Microphone access is required to record voice notes. Please allow microphone permissions in your browser.');
    }
  };

  const recordingSecondsRef = useRef<number>(0);

  const stopVoiceRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
  };

  // Image Upload handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await compressImage(file, { maxWidth: 900, maxHeight: 900, quality: 0.75 });
      if (dataUrl) {
        const isDirect = activeChannel !== 'broadcast' && activeChannel !== 'announcements';
        sendMessage({
          groupId: isDirect ? undefined : 'all-staff',
          recipientId: isDirect ? activeChannel : undefined,
          type: 'image',
          content: dataUrl,
        });
        socketService.emitChatMessage({
          senderId: currentUser?.id,
          senderName: currentUser?.name,
          senderRole: currentUser?.role,
          recipientId: isDirect ? activeChannel : undefined,
          groupId: isDirect ? undefined : 'all-staff',
          type: 'image',
          content: dataUrl,
          timestamp: new Date().toISOString(),
        });
        soundEffects.playMessageChime();
      }
    } catch (err) {
      console.warn('Chat image send error:', err);
    }
    e.target.value = '';
  };

  // Post Manager Announcement
  const handlePostAnc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ancTitle || !ancContent) return;

    postAnnouncement({
      title: ancTitle,
      content: ancContent,
      priority: ancPriority,
    });

    socketService.emitAnnouncement({
      title: ancTitle,
      content: ancContent,
      priority: ancPriority,
      authorName: currentUser?.name,
      createdAt: new Date().toISOString(),
    });

    soundEffects.playAnnouncementFanfare();
    setShowAncModal(false);
    setAncTitle('');
    setAncContent('');
  };

  // Start Real WebRTC Call
  const handleStartCall = (type: 'voice' | 'video', userObj: { id?: string; name: string; role?: string; avatarUrl?: string }) => {
    if (!currentUser) return;
    const target = {
      id: userObj.id || `u-${Math.random()}`,
      name: userObj.name,
      role: userObj.role || 'Staff',
      avatarUrl: userObj.avatarUrl,
    };
    socketService.startCall(
      {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        avatarUrl: currentUser.avatarUrl,
      },
      target,
      type
    );
  };

  const getUserById = (id: string) => users.find((u) => u.id === id);

  return (
    <div className="space-y-4 text-slate-900 dark:text-white">
      {/* Header & Broadcast Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-400" />
            WhatsApp Style Real-Time Messaging & Calls
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Instant peer-to-peer messaging with profile avatars, voice notes, WebRTC calls, and broadcast notices.
          </p>
        </div>

        {canPostAnnounce && (
          <button
            onClick={() => setShowAncModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
          >
            <Megaphone className="w-4 h-4" />
            Broadcast Notice
          </button>
        )}
      </div>

      {/* Main WhatsApp Interface */}
      <div className="h-[580px] rounded-2xl bg-[#0b141a] border border-slate-800 shadow-2xl flex flex-col md:flex-row overflow-hidden w-full max-w-full">
          {/* Left Sidebar Users & Channels */}
          <div className={`w-full md:w-72 border-r border-slate-800 bg-[#111b21] p-3 space-y-3 shrink-0 flex flex-col justify-between h-full ${mobileChatView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {/* Search User Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search user or picture..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#202c33] border border-slate-700 text-white text-xs placeholder:text-slate-400"
                />
              </div>

              {/* CEO Executive WhatsApp Dispatch Panel */}
              {activeRole === 'ceo' && (
                <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-950/60 to-emerald-950/60 border border-amber-500/40 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      CEO Executive WhatsApp Dispatch
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200">
                      VIP
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-tight">
                    Direct 1-click WhatsApp messaging to Key Leaders:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {users
                      .filter((u) => ['developer', 'manager', 'second_manager', 'sales_manager'].includes(u.role))
                      .map((u) => (
                        <button
                          key={`ceo-wa-${u.id}`}
                          onClick={() => handleOpenWhatsApp(u)}
                          className="p-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 hover:text-white text-[10px] font-bold flex items-center gap-1.5 transition truncate cursor-pointer text-left"
                          title={`WhatsApp ${u.name} (${u.role})`}
                        >
                          <Send className="w-3 h-3 text-emerald-400 shrink-0" />
                          <div className="truncate min-w-0">
                            <div className="truncate">{u.name}</div>
                            <div className="text-[8px] text-emerald-400 uppercase font-mono truncate">{u.role.replace('_', ' ')}</div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Channels List */}
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-2">Factory Channels</div>

              {/* All Staff Factory Group with unread counter */}
              {(() => {
                const groupUnread = messages.filter(
                  (m) =>
                    !m.receiverId &&
                    (m.groupId === 'all-staff' || !m.groupId) &&
                    m.senderId !== currentUser?.id &&
                    (!m.readBy || !m.readBy.includes(currentUser?.id || ''))
                ).length;

                return (
                  <button
                    onClick={() => {
                      setActiveChannel('broadcast');
                      setMobileChatView('chat');
                    }}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                      activeChannel === 'broadcast'
                        ? 'bg-[#00a884] text-white shadow-md font-bold'
                        : 'text-slate-300 hover:bg-[#202c33]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        PM
                      </div>
                      <div className="text-left truncate">
                        <div className="truncate font-bold">All Staff Factory Group</div>
                        <div className="text-[10px] opacity-80 truncate">Public • Visible to all workers</div>
                      </div>
                    </div>
                    {groupUnread > 0 && activeChannel !== 'broadcast' && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[10px] shrink-0">
                        {groupUnread}
                      </span>
                    )}
                  </button>
                );
              })()}

              <button
                onClick={() => {
                  setActiveChannel('announcements');
                  setMobileChatView('chat');
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeChannel === 'announcements'
                    ? 'bg-amber-600 text-white shadow-md font-bold'
                    : 'text-slate-300 hover:bg-[#202c33]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div className="text-left truncate flex-1">
                  <div className="truncate font-bold">Announcements Feed</div>
                  <div className="text-[10px] opacity-80 truncate">Official Manager Notices</div>
                </div>
              </button>

              {/* Direct Messaging Users List */}
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-2 pt-2">
                Direct Private Chats ({users.filter(u => u.id !== currentUser?.id).length})
              </div>
              <div className="space-y-1">
                {users
                  .filter(
                    (u) =>
                      u.id !== currentUser?.id &&
                      (u.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        u.role.toLowerCase().includes(searchFilter.toLowerCase()))
                  )
                  .map((u) => {
                    const avatarUrl =
                      idbAvatars[u.id] || u.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=00a884&color=fff&bold=true`;

                    // Unread direct messages sent from this user to currentUser
                    const dmUnread = messages.filter(
                      (m) =>
                        m.senderId === u.id &&
                        m.receiverId === currentUser?.id &&
                        (!m.readBy || !m.readBy.includes(currentUser?.id || ''))
                    ).length;

                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          setActiveChannel(u.id);
                          setMobileChatView('chat');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                          activeChannel === u.id
                            ? 'bg-[#00a884] text-white font-bold shadow-md'
                            : 'text-slate-300 hover:bg-[#202c33]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {/* User Profile Picture Avatar */}
                          <div className="relative shrink-0">
                            <img
                              src={avatarUrl}
                              alt={u.name}
                              className="w-9 h-9 rounded-full object-cover border border-emerald-500/60 shadow-xs"
                            />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#111b21] absolute bottom-0 right-0" />
                          </div>
                          <div className="text-left truncate">
                            <div className="truncate font-bold leading-tight">{u.name}</div>
                            <div className="text-[10px] text-slate-400 truncate uppercase">{u.role}</div>
                          </div>
                        </div>

                        {dmUnread > 0 && activeChannel !== u.id && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[10px] shrink-0 shadow-xs">
                            {dmUnread}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="p-2 bg-[#202c33] rounded-xl border border-slate-800 text-[10px] text-emerald-400 flex items-center gap-2 w-full shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              WhatsApp Encrypted Server Push Active
            </div>
          </div>

          {/* Right Chat Area with Dark Wallpaper */}
          <div className={`flex-1 w-full flex flex-col justify-between bg-[#0b141a] relative h-full ${mobileChatView === 'list' ? 'hidden md:flex' : 'flex'}`}>
            {/* WhatsApp Header */}
            <div className="p-2.5 sm:p-3 bg-[#202c33] border-b border-slate-800 flex items-center justify-between text-white z-10 shadow-md">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  onClick={() => setMobileChatView('list')}
                  className="md:hidden flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 text-emerald-400 hover:text-white shrink-0 cursor-pointer font-bold text-xs"
                  title="Back to conversation list"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                {activeChannel !== 'broadcast' && activeChannel !== 'announcements' ? (
                  <>
                    <div className="relative shrink-0">
                      <img
                        src={
                          idbAvatars[activeChannel] || getUserById(activeChannel)?.avatarUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            getUserById(activeChannel)?.name || 'User'
                          )}&background=00a884&color=fff&bold=true`
                        }
                        alt="User"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-emerald-400 shadow-sm"
                      />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#202c33] absolute bottom-0 right-0" />
                    </div>
                    <div className="truncate min-w-0">
                      <div className="font-bold text-xs truncate flex items-center gap-1.5">
                        <span>{getUserById(activeChannel)?.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-normal">
                          🔒 Direct & Private
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-400 truncate">
                        Private 1-to-1 • Only you and {getUserById(activeChannel)?.name} can read
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      PM
                    </div>
                    <div className="truncate min-w-0">
                      <div className="font-bold text-xs truncate flex items-center gap-1.5">
                        <span>{activeChannel === 'broadcast' ? 'All Staff Factory Group' : 'Manager Announcements'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-normal">
                          📢 All Staff
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {activeChannel === 'broadcast'
                          ? 'Factory-wide channel • Visible to all team members'
                          : 'Official management announcements feed'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Call & WhatsApp Buttons */}
              {activeChannel !== 'broadcast' && activeChannel !== 'announcements' && (
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {/* WhatsApp Launcher */}
                  <button
                    onClick={() => handleOpenWhatsApp(getUserById(activeChannel))}
                    className="p-1.5 sm:p-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition shadow-sm cursor-pointer shrink-0"
                    title="Open WhatsApp Chat"
                  >
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* HD Voice Call */}
                  <button
                    onClick={() => {
                      if (activeChannel === currentUser?.id) {
                        alert("You cannot call yourself.");
                        return;
                      }
                      handleStartCall('voice', {
                        id: activeChannel,
                        name: getUserById(activeChannel)?.name || 'Worker',
                        avatarUrl:
                          idbAvatars[activeChannel] || getUserById(activeChannel)?.avatarUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            getUserById(activeChannel)?.name || 'Worker'
                          )}&background=00a884&color=fff&bold=true`,
                      });
                    }}
                    className="p-1.5 sm:p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer shrink-0"
                    title="Voice Call (WebRTC HD)"
                  >
                    <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* HD Video Call */}
                  <button
                    onClick={() => {
                      if (activeChannel === currentUser?.id) {
                        alert("You cannot call yourself.");
                        return;
                      }
                      handleStartCall('video', {
                        id: activeChannel,
                        name: getUserById(activeChannel)?.name || 'Worker',
                        avatarUrl:
                          idbAvatars[activeChannel] || getUserById(activeChannel)?.avatarUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            getUserById(activeChannel)?.name || 'Worker'
                          )}&background=00a884&color=fff&bold=true`,
                      });
                    }}
                    className="p-1.5 sm:p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm cursor-pointer shrink-0"
                    title="Video Call (WebRTC HD)"
                  >
                    <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Messages Feed */}
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto overflow-x-hidden space-y-4 bg-[#0b141a] bg-opacity-95 min-w-0 w-full">
              {activeChannel === 'announcements' ? (
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <div key={a.id} className="p-4 rounded-xl bg-[#202c33] border border-amber-500/40 text-xs space-y-2 text-white">
                      <div className="font-bold text-amber-400 text-sm flex items-center gap-2">
                        <Megaphone className="w-4 h-4" />
                        {a.title}
                      </div>
                      <p className="text-slate-200 leading-relaxed">{a.content}</p>
                      <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-700 flex justify-between">
                        <span>Posted by: {a.authorName}</span>
                        <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {announcements.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No broadcast announcements published yet.
                    </div>
                  )}
                </div>
              ) : visibleMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 text-emerald-500/50" />
                  <p className="text-xs">
                    {activeChannel === 'broadcast'
                      ? 'No group messages in the factory broadcast channel yet. Say hello!'
                      : 'No private messages in this chat yet. Send a direct message or voice note!'}
                  </p>
                </div>
              ) : (
                visibleMessages.map((m) => {
                  const isMe = m.senderId === currentUser?.id;
                  const sender = getUserById(m.senderId);
                  const senderAvatar =
                    (sender ? idbAvatars[sender.id] : undefined) ||
                    sender?.avatarUrl ||
                    (isMe ? currentUser?.avatarUrl : undefined) ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(m.senderName)}&background=00a884&color=fff&bold=true`;

                  return (
                    <div key={m.id} className={`flex items-end gap-2 sm:gap-2.5 max-w-full min-w-0 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* User Profile Picture Avatar next to every chat message */}
                      <img
                        src={senderAvatar}
                        alt={m.senderName}
                        className="w-8 h-8 rounded-full object-cover border border-emerald-500/50 shrink-0 shadow-xs"
                      />

                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%] min-w-0`}>
                        <div className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium truncate max-w-full">
                          {m.senderName} <span className="text-emerald-400">({m.senderRole === 'sales_manager' ? 'Sales Production Officer' : m.senderRole})</span>
                        </div>

                        {/* Message Bubble (WhatsApp Colors: #005c4b for Me, #202c33 for Others) */}
                        <div
                          className={`max-w-full min-w-0 p-3 rounded-2xl text-xs space-y-1.5 shadow-md break-words [overflow-wrap:anywhere] ${
                            isMe
                              ? 'bg-[#005c4b] text-white rounded-br-none'
                              : 'bg-[#202c33] text-white rounded-bl-none border border-slate-700'
                          }`}
                        >
                          {m.type === 'text' && (
                            editingMessageId === m.id ? (
                              <div className="space-y-2 min-w-[200px] sm:min-w-[260px] pt-1">
                                <div className="text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
                                  <Edit2 className="w-3 h-3" /> Edit Sent Message
                                </div>
                                <textarea
                                  value={editInputText}
                                  onChange={(e) => setEditInputText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSaveEdit(m.id);
                                    } else if (e.key === 'Escape') {
                                      handleCancelEdit();
                                    }
                                  }}
                                  autoFocus
                                  rows={2}
                                  className="w-full p-2 bg-[#121b22] border border-emerald-400 rounded-lg text-white text-xs focus:ring-1 focus:ring-emerald-400 focus:outline-hidden resize-none"
                                />
                                <div className="flex items-center justify-end gap-1.5 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-medium rounded-md transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" /> Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(m.id)}
                                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] rounded-md transition flex items-center gap-1 cursor-pointer shadow-xs"
                                  >
                                    <Check className="w-3 h-3" /> Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-wrap min-w-0">
                                {m.content}
                              </p>
                            )
                          )}

                          {m.type === 'voice' && (
                            <VoiceNotePlayer
                              audioUrl={m.content}
                              durationSeconds={m.durationSeconds || 5}
                              isMe={isMe}
                              senderName={m.senderName}
                            />
                          )}

                          {m.type === 'image' && (
                            <div>
                              <img src={m.content} alt="Attachment" className="rounded-lg max-h-48 object-cover border border-slate-700 w-full" />
                              <span className="text-[10px] text-slate-300 mt-1 block">Photo Attachment</span>
                            </div>
                          )}

                          {/* Delete Confirmation Box */}
                          {confirmDeleteId === m.id && (
                            <div className="p-2 bg-rose-950/90 border border-rose-500/50 rounded-lg text-[11px] text-rose-100 space-y-1.5 mt-1">
                              <p className="font-semibold">Delete this message for everyone?</p>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] rounded cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMessage(m.id)}
                                  className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Edit & Delete Action Buttons (Visible to Sender) */}
                          {isMe && editingMessageId !== m.id && confirmDeleteId !== m.id && (
                            <div className="flex items-center gap-2 text-[10px] text-emerald-200/90 pt-1 border-t border-emerald-600/30 mt-1">
                              {m.type === 'text' && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(m)}
                                  className="hover:text-cyan-300 transition flex items-center gap-1 cursor-pointer py-0.5"
                                  title="Edit sent message"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                  <span>Edit</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(m.id)}
                                className="hover:text-rose-300 transition flex items-center gap-1 cursor-pointer ml-auto py-0.5"
                                title="Delete sent message"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}

                          <div className="text-[9px] text-emerald-200/80 text-right flex items-center justify-end gap-1 pt-0.5">
                            {m.isEdited && <span className="italic text-[8.5px] text-cyan-200/80">(edited)</span>}
                            <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            {activeChannel !== 'announcements' && (
              <div className="p-2 sm:p-3 border-t border-slate-800 bg-[#202c33] z-10 w-full max-w-full">
                {isRecording ? (
                  <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-rose-600 text-white text-xs animate-pulse w-full">
                    <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                      <Mic className="w-4 h-4 shrink-0" />
                      <span className="truncate">Recording Voice Note... ({recordingSeconds}s)</span>
                    </div>
                    <button
                      onClick={stopVoiceRecording}
                      className="px-2.5 py-1 bg-white text-rose-600 font-bold rounded-lg hover:bg-slate-100 shrink-0 text-xs cursor-pointer"
                    >
                      Send Note
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2 w-full max-w-full">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 sm:p-2 text-slate-400 hover:text-emerald-400 rounded-lg transition cursor-pointer shrink-0"
                      title="Attach Photo / Image"
                    >
                      <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={startChatCamera}
                      className="p-1.5 sm:p-2 text-slate-400 hover:text-cyan-400 rounded-lg transition cursor-pointer shrink-0"
                      title="Take Live Camera Photo"
                    >
                      <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer shrink-0"
                      title="Record Voice Note"
                    >
                      <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type WhatsApp message..."
                      className="flex-1 min-w-0 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#2a3942] border border-slate-700 text-white text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />

                    <button
                      type="submit"
                      className="p-2 sm:p-2.5 rounded-xl bg-[#00a884] hover:bg-emerald-600 text-white transition shadow-md cursor-pointer shrink-0"
                      title="Send Message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}

                {/* Live Camera Snapshot Modal for Chat */}
                {isCameraActive && (
                  <div className="mt-3 p-3 bg-slate-900 border-2 border-cyan-500/80 rounded-2xl shadow-2xl space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        Take Live Photo to Send in Chat
                      </span>
                      <button
                        type="button"
                        onClick={stopChatCamera}
                        className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="relative aspect-video max-w-sm mx-auto bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                      <video
                        ref={chatVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover mirror"
                      />
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={stopChatCamera}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCaptureAndSendPhoto}
                        className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 cursor-pointer active:scale-95"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Snap & Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      {/* Post Announcement Modal */}
      {showAncModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-white space-y-4 text-xs">
            <h3 className="text-base font-extrabold flex items-center gap-2 border-b border-slate-800 pb-3">
              <Megaphone className="w-5 h-5 text-amber-500" />
              Broadcast Factory Announcement
            </h3>

            <form onSubmit={handlePostAnc} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Announcement Title</label>
                <input
                  type="text"
                  value={ancTitle}
                  onChange={(e) => setAncTitle(e.target.value)}
                  placeholder="e.g. Mandatory Shift Notice"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Priority Level</label>
                <select
                  value={ancPriority}
                  onChange={(e) => setAncPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 font-semibold"
                >
                  <option value="normal">Normal Priority</option>
                  <option value="urgent">Urgent Priority</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Content Body</label>
                <textarea
                  value={ancContent}
                  onChange={(e) => setAncContent(e.target.value)}
                  placeholder="Write notice..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAncModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 font-bold text-white rounded-xl shadow-md"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
