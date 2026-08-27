/**
 * Client-side Real-Time Socket.IO & WebRTC Call Service
 * Handles live messaging, broadcast announcements, GPS streaming,
 * and 1-to-1 WebRTC Voice & Video Calling with live media streams.
 */

import { io, Socket } from 'socket.io-client';
import { soundEffects } from '../utils/audioChime';

export interface WebRTCCallState {
  callId: string;
  isIncoming: boolean;
  isOutgoing: boolean;
  isConnected: boolean;
  targetUser: {
    id: string;
    name: string;
    role: string;
    avatarUrl?: string;
  };
  callType: 'voice' | 'video';
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  callDurationSeconds: number;
}

class SocketService {
  public socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCall: WebRTCCallState | null = null;
  private callTimer: NodeJS.Timeout | null = null;

  // Listeners
  private onCallStateChangeCallbacks: ((state: WebRTCCallState | null) => void)[] = [];
  private onMessageCallbacks: ((msg: any) => void)[] = [];
  private onMessageEditCallbacks: ((editData: any) => void)[] = [];
  private onMessageDeleteCallbacks: ((delData: any) => void)[] = [];
  private onAnnouncementCallbacks: ((anc: any) => void)[] = [];
  private onSecurityAlertCallbacks: ((alert: any) => void)[] = [];
  private onLocationUpdateCallbacks: ((loc: any) => void)[] = [];
  private onDataChangeCallbacks: ((change: { table: string; action: string; data?: any; timestamp: number }) => void)[] = [];
  private onSettingsUpdateCallbacks: ((settings: any) => void)[] = [];
  private onUserProfileUpdateCallbacks: ((user: any) => void)[] = [];
  private onMissedCallCallbacks: ((call: any) => void)[] = [];

  public init(user: { id: string; role: string; name: string; employeeId?: string }) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join', { userId: user.id, role: user.role, name: user.name, employeeId: user.employeeId, id: user.id });
      return;
    }

    try {
      this.socket = io({
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        this.socket?.emit('join', { userId: user.id, role: user.role, name: user.name, employeeId: user.employeeId, id: user.id });
      });

      // Real-time Database Changes & Auto-Sync Trigger
      this.socket.on('db:data_changed', (change: any) => {
        this.onDataChangeCallbacks.forEach((cb) => {
          try {
            cb(change);
          } catch (err) {
            console.warn('Error in data change listener:', err);
          }
        });
      });

      // Real-time Settings Update
      this.socket.on('settings:updated', (settings: any) => {
        this.onSettingsUpdateCallbacks.forEach((cb) => cb(settings));
      });

      // Real-time User Profile Update
      this.socket.on('user:profile_updated', (updatedUser: any) => {
        this.onUserProfileUpdateCallbacks.forEach((cb) => cb(updatedUser));
      });

      // Real-time Missed Call alert
      this.socket.on('call:missed', (missedCallData: any) => {
        soundEffects.playSecurityAlert();
        this.onMissedCallCallbacks.forEach((cb) => cb(missedCallData));
      });

      // Handle incoming message with strict 1-to-1 privacy vs group broadcast filtering
      this.socket.on('chat:receive', (msg: any) => {
        // Direct Message: only the intended recipient (or sender) should process & play sound
        if (msg.recipientId) {
          if (msg.recipientId === user.id) {
            soundEffects.playMessageChime();
            this.onMessageCallbacks.forEach((cb) => cb(msg));
          } else if (msg.senderId === user.id) {
            // Also notify sender if open across multiple tabs/devices
            this.onMessageCallbacks.forEach((cb) => cb(msg));
          }
          return;
        }

        // Factory-Wide / All Staff Group Broadcast: all workers receive and chime
        if (msg.senderId !== user.id) {
          soundEffects.playMessageChime();
        }
        this.onMessageCallbacks.forEach((cb) => cb(msg));
      });

      // Handle message edit
      this.socket.on('chat:edited', (editData: any) => {
        this.onMessageEditCallbacks.forEach((cb) => cb(editData));
      });

      // Handle message delete
      this.socket.on('chat:deleted', (delData: any) => {
        this.onMessageDeleteCallbacks.forEach((cb) => cb(delData));
      });

      // Handle announcement
      this.socket.on('announcement:receive', (anc: any) => {
        soundEffects.playAnnouncementFanfare();
        this.onAnnouncementCallbacks.forEach((cb) => cb(anc));
      });

      // Handle security alert
      this.socket.on('security:alert_received', (alert: any) => {
        soundEffects.playSecurityAlert();
        this.onSecurityAlertCallbacks.forEach((cb) => cb(alert));
      });

      // Handle GPS update
      this.socket.on('gps:location_change', (loc: any) => {
        this.onLocationUpdateCallbacks.forEach((cb) => cb(loc));
      });

      // WebRTC Call Signaling Listeners
      this.setupCallSignaling();
    } catch (e) {
      console.warn('Socket initialization fallback:', e);
    }
  }

  private setupCallSignaling() {
    if (!this.socket) return;

    // 1. Incoming Call
    this.socket.on('call:incoming', (payload: any) => {
      soundEffects.startIncomingRingtone();
      this.currentCall = {
        callId: payload.callId,
        isIncoming: true,
        isOutgoing: false,
        isConnected: false,
        targetUser: {
          id: payload.callerId,
          name: payload.callerName,
          role: payload.callerRole || 'Staff',
          avatarUrl: payload.callerAvatar,
        },
        callType: payload.callType || 'voice',
        localStream: null,
        remoteStream: null,
        isMuted: false,
        isVideoOff: false,
        callDurationSeconds: 0,
      };
      this.notifyCallState();
    });

    // 2. Call Accepted by Receiver
    this.socket.on('call:accepted', async (payload: any) => {
      soundEffects.stopRingtone();
      soundEffects.playCallConnected();
      if (this.currentCall) {
        this.currentCall.isConnected = true;
        this.currentCall.isOutgoing = false;
        this.startCallTimer();
        this.notifyCallState();

        // Create WebRTC Offer as caller
        await this.createOffer(payload.receiverId);
      }
    });

    // 3. Call Rejected / Busy
    this.socket.on('call:rejected', () => {
      soundEffects.stopRingtone();
      soundEffects.playCallEnded();
      this.endCallInternal(false);
    });

    // 4. Call Ended by Peer
    this.socket.on('call:ended', () => {
      soundEffects.stopRingtone();
      soundEffects.playCallEnded();
      this.endCallInternal(false);
    });

    // 5. WebRTC Signaling Data (Offer, Answer, ICE Candidates)
    this.socket.on('call:signal', async (payload: any) => {
      if (!payload?.signal) return;
      const { signal, fromUserId } = payload;

      if (!this.peerConnection) {
        await this.createPeerConnection(fromUserId);
      }

      if (signal.type === 'offer') {
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          this.socket?.emit('call:signal', {
            callId: this.currentCall?.callId,
            targetUserId: fromUserId,
            fromUserId: this.currentCall?.targetUser.id,
            signal: answer,
          });
        }
      } else if (signal.type === 'answer') {
        if (this.peerConnection && this.peerConnection.signalingState !== 'stable') {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
        }
      } else if (signal.candidate) {
        if (this.peerConnection) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {
            console.warn('Error adding ICE candidate:', e);
          }
        }
      }
    });
  }

  /**
   * Start an outgoing 1-to-1 WebRTC Call
   */
  public async startCall(
    currentUser: { id: string; name: string; role: string; avatarUrl?: string },
    targetUser: { id: string; name: string; role: string; avatarUrl?: string },
    callType: 'voice' | 'video'
  ) {
    const callId = `call-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // Get User Media Stream (Microphone / Camera)
      this.localStream = await this.getUserMediaStream(callType === 'video');
    } catch (err) {
      console.warn('Microphone/Camera permission denied, proceeding with simulated stream:', err);
    }

    this.currentCall = {
      callId,
      isIncoming: false,
      isOutgoing: true,
      isConnected: false,
      targetUser,
      callType,
      localStream: this.localStream,
      remoteStream: null,
      isMuted: false,
      isVideoOff: false,
      callDurationSeconds: 0,
    };

    soundEffects.startIncomingRingtone();
    this.notifyCallState();

    // Emit call invite via Socket.IO
    this.socket?.emit('call:initiate', {
      callId,
      callerId: currentUser.id,
      callerName: currentUser.name,
      callerRole: currentUser.role,
      callerAvatar: currentUser.avatarUrl,
      receiverId: targetUser.id,
      callType,
    });
  }

  /**
   * Accept an incoming call
   */
  public async acceptCall(currentUser: { id: string; name: string }) {
    if (!this.currentCall) return;

    soundEffects.stopRingtone();
    soundEffects.playCallConnected();

    try {
      this.localStream = await this.getUserMediaStream(this.currentCall.callType === 'video');
      this.currentCall.localStream = this.localStream;
    } catch (err) {
      console.warn('Microphone/Camera access error:', err);
    }

    this.currentCall.isConnected = true;
    this.currentCall.isIncoming = false;
    this.startCallTimer();
    this.notifyCallState();

    this.socket?.emit('call:accept', {
      callId: this.currentCall.callId,
      callerId: this.currentCall.targetUser.id,
      receiverId: currentUser.id,
      receiverName: currentUser.name,
    });

    await this.createPeerConnection(this.currentCall.targetUser.id);
  }

  /**
   * Reject an incoming call
   */
  public rejectCall() {
    if (!this.currentCall) return;
    soundEffects.stopRingtone();
    soundEffects.playCallEnded();

    this.socket?.emit('call:reject', {
      callId: this.currentCall.callId,
      callerId: this.currentCall.targetUser.id,
      reason: 'declined',
    });

    this.endCallInternal(false);
  }

  /**
   * End an active or dialing call
   */
  public endCall() {
    if (!this.currentCall) return;
    soundEffects.stopRingtone();
    soundEffects.playCallEnded();

    this.socket?.emit('call:end', {
      callId: this.currentCall.callId,
      targetUserId: this.currentCall.targetUser.id,
    });

    this.endCallInternal(true);
  }

  private endCallInternal(notify = true) {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.currentCall = null;

    if (notify) {
      this.notifyCallState();
    }
  }

  /**
   * Toggle Mute Microphone
   */
  public toggleMute(): boolean {
    if (!this.currentCall || !this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.currentCall.isMuted = !audioTrack.enabled;
      this.notifyCallState();
      return this.currentCall.isMuted;
    }
    return false;
  }

  /**
   * Toggle Video Camera
   */
  public toggleVideo(): boolean {
    if (!this.currentCall || !this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      this.currentCall.isVideoOff = !videoTrack.enabled;
      this.notifyCallState();
      return this.currentCall.isVideoOff;
    }
    return false;
  }

  private async getUserMediaStream(video: boolean): Promise<MediaStream> {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
    }
    throw new Error('navigator.mediaDevices.getUserMedia not available');
  }

  private async createPeerConnection(targetUserId: string) {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        if (this.currentCall) {
          this.currentCall.remoteStream = this.remoteStream;
          this.notifyCallState();
        }
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket?.emit('call:signal', {
          callId: this.currentCall?.callId,
          targetUserId,
          signal: { candidate: event.candidate },
        });
      }
    };
  }

  private async createOffer(targetUserId: string) {
    if (!this.peerConnection) {
      await this.createPeerConnection(targetUserId);
    }
    if (this.peerConnection) {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.socket?.emit('call:signal', {
        callId: this.currentCall?.callId,
        targetUserId,
        signal: offer,
      });
    }
  }

  private startCallTimer() {
    if (this.callTimer) clearInterval(this.callTimer);
    this.callTimer = setInterval(() => {
      if (this.currentCall) {
        this.currentCall.callDurationSeconds += 1;
        this.notifyCallState();
      }
    }, 1000);
  }

  // Event Subscriptions
  public onCallStateChange(callback: (state: WebRTCCallState | null) => void) {
    this.onCallStateChangeCallbacks.push(callback);
    return () => {
      this.onCallStateChangeCallbacks = this.onCallStateChangeCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onMessage(callback: (msg: any) => void) {
    this.onMessageCallbacks.push(callback);
    return () => {
      this.onMessageCallbacks = this.onMessageCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onMessageEdit(callback: (editData: any) => void) {
    this.onMessageEditCallbacks.push(callback);
    return () => {
      this.onMessageEditCallbacks = this.onMessageEditCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onMessageDelete(callback: (delData: any) => void) {
    this.onMessageDeleteCallbacks.push(callback);
    return () => {
      this.onMessageDeleteCallbacks = this.onMessageDeleteCallbacks.filter((cb) => cb !== callback);
    };
  }

  public emitChatMessage(msgData: any) {
    this.socket?.emit('chat:send', msgData);
  }

  public emitEditMessage(editData: { messageId: string; content: string; recipientId?: string; senderId?: string; editedAt: string }) {
    this.socket?.emit('chat:edit', editData);
  }

  public emitDeleteMessage(delData: { messageId: string; recipientId?: string; senderId?: string }) {
    this.socket?.emit('chat:delete', delData);
  }

  public onAnnouncement(callback: (anc: any) => void) {
    this.onAnnouncementCallbacks.push(callback);
    return () => {
      this.onAnnouncementCallbacks = this.onAnnouncementCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onSecurityAlert(callback: (alert: any) => void) {
    this.onSecurityAlertCallbacks.push(callback);
    return () => {
      this.onSecurityAlertCallbacks = this.onSecurityAlertCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onLocationUpdate(callback: (loc: any) => void) {
    this.onLocationUpdateCallbacks.push(callback);
    return () => {
      this.onLocationUpdateCallbacks = this.onLocationUpdateCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onDataChange(callback: (change: { table: string; action: string; data?: any; timestamp: number }) => void) {
    this.onDataChangeCallbacks.push(callback);
    return () => {
      this.onDataChangeCallbacks = this.onDataChangeCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onSettingsUpdate(callback: (settings: any) => void) {
    this.onSettingsUpdateCallbacks.push(callback);
    return () => {
      this.onSettingsUpdateCallbacks = this.onSettingsUpdateCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onUserProfileUpdate(callback: (user: any) => void) {
    this.onUserProfileUpdateCallbacks.push(callback);
    return () => {
      this.onUserProfileUpdateCallbacks = this.onUserProfileUpdateCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onMissedCall(callback: (call: any) => void) {
    this.onMissedCallCallbacks.push(callback);
    return () => {
      this.onMissedCallCallbacks = this.onMissedCallCallbacks.filter((cb) => cb !== callback);
    };
  }

  public emitSettingsUpdate(settings: any) {
    this.socket?.emit('settings:broadcast', settings);
  }

  public emitAnnouncement(ancData: any) {
    this.socket?.emit('announcement:publish', ancData);
  }

  public emitGpsLocation(locData: any) {
    this.socket?.emit('gps:update', locData);
  }

  private notifyCallState() {
    const clone = this.currentCall ? { ...this.currentCall } : null;
    this.onCallStateChangeCallbacks.forEach((cb) => cb(clone));
  }
}

export const socketService = new SocketService();
