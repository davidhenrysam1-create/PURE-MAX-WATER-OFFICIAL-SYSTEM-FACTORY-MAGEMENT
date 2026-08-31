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
  /**
   * Set when the browser refused or could not open the mic/camera. Surfaced in
   * the call UI so the user knows exactly why there is no audio, instead of a
   * silently dead call (Issue #11).
   */
  mediaError?: string | null;
  /** True while we are (re)negotiating the peer connection. */
  isConnecting?: boolean;
}

/** Human-readable message for a getUserMedia / getUserMedia-adjacent failure. */
function describeMediaError(err: unknown): string {
  const name = (err as { name?: string })?.name || '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Microphone/camera permission was blocked. Allow access in your browser address bar, then press Retry.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No microphone or camera was found on this device.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'The microphone or camera is already in use by another application.';
    case 'OverconstrainedError':
      return 'No device matches the requested audio/video settings.';
    case 'SecurityError':
      return 'Media access was blocked by the browser. This page must be served over HTTPS or localhost.';
    default:
      return 'Could not open the microphone/camera. Press Retry to try again.';
  }
}

class SocketService {
  public socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCall: WebRTCCallState | null = null;
  private callTimer: NodeJS.Timeout | null = null;
  /**
   * ICE candidates can arrive before the remote description has been applied
   * (the signalling channel is faster than the offer/answer round trip).
   * Calling addIceCandidate() too early throws InvalidStateError and silently
   * drops that candidate, which shows up as a call that connects but carries no
   * media. They are buffered here and flushed after setRemoteDescription().
   */
  private pendingIceCandidates: RTCIceCandidateInit[] = [];

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
        this.currentCall.isConnecting = false;
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
          await this.flushPendingIceCandidates();

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
          await this.flushPendingIceCandidates();
        }
      } else if (signal.candidate) {
        if (this.peerConnection) {
          // Candidates that land before the offer/answer is applied cannot be
          // added yet — buffer them for flushPendingIceCandidates().
          if (!this.peerConnection.remoteDescription) {
            this.pendingIceCandidates.push(signal.candidate);
            return;
          }
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

    // Open the mic/camera BEFORE signalling. If this fails we still place the
    // call, but we publish the reason so the UI can offer a Retry button
    // instead of leaving the user in a silent, one-way call.
    let mediaError: string | null = null;
    try {
      this.localStream = await this.getUserMediaStream(callType === 'video');
    } catch (err) {
      console.warn('Microphone/Camera could not be opened for outgoing call:', err);
      mediaError = describeMediaError(err);
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
      mediaError,
      isConnecting: true,
    };

    // Outgoing calls get a ring-back tone, not the receiver's urgent ring.
    if (mediaError) {
      soundEffects.playBusyTone();
    } else {
      soundEffects.startOutgoingRingtone();
    }
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

    this.currentCall.mediaError = null;
    this.currentCall.isConnecting = true;

    try {
      this.localStream = await this.getUserMediaStream(this.currentCall.callType === 'video');
      this.currentCall.localStream = this.localStream;
    } catch (err) {
      console.warn('Microphone/Camera access error on accept:', err);
      this.currentCall.mediaError = describeMediaError(err);
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
      // Detach handlers first so the teardown below cannot fire more callbacks.
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.pendingIceCandidates = [];
    this.remoteStream = null;
    this.currentCall = null;

    soundEffects.stopRingtone();

    // THE AUTO-DISMISS FIX (Issue #11).
    //
    // The old code read:
    //     if (notify) { this.notifyCallState(); }
    // and the socket handlers for `call:ended` / `call:rejected` call
    // endCallInternal(false). So when the OTHER party hung up, `currentCall`
    // was nulled out but no state change was ever published — the receiver's
    // React overlay kept rendering the stale call object and stayed on screen
    // until the page was reloaded. Exactly the reported symptom.
    //
    // The UI must always be told that the call is over, regardless of whether
    // we are the one emitting the network signal. `notify` now only controls
    // the outgoing `call:end` emit (handled by endCall()), never the local
    // state broadcast.
    this.notifyCallState();
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

  /**
   * Open the local mic / camera.
   *
   * The original implementation made exactly ONE attempt with a fixed
   * constraint set. Any failure (camera busy, a laptop with no webcam, a
   * browser that rejects `facingMode`, an insecure origin) threw, the caller
   * swallowed the error into console.warn, and the call proceeded with
   * `localStream === null`. Because addTrack() is never called with a null
   * stream, the peer connection then negotiates with NO media at all and both
   * sides sit in a silent call — the "mic and video don't transmit" report.
   *
   * This now walks a ladder of progressively relaxed constraints so a video
   * call can still connect as audio-only, and it only throws once every rung
   * has genuinely failed.
   */
  private async getUserMediaStream(video: boolean): Promise<MediaStream> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(
        new Error('navigator.mediaDevices.getUserMedia is not available in this browser.'),
        { name: 'NotSupportedError' }
      );
    }

    // Every modern browser hides mediaDevices entirely on insecure origins.
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      throw Object.assign(
        new Error('Media capture requires a secure context (HTTPS or localhost).'),
        { name: 'SecurityError' }
      );
    }

    const voiceConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };

    const attempts: MediaStreamConstraints[] = video
      ? [
          // 1. Ideal: front camera at VGA with full voice processing.
          { audio: voiceConstraints, video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } },
          // 2. Drop facingMode / resolution requests — some desktop browsers
          //    reject facingMode outright with OverconstrainedError.
          { audio: true, video: true },
          // 3. No camera available or busy — still place the call as voice.
          { audio: true, video: false },
        ]
      : [
          { audio: voiceConstraints, video: false },
          { audio: true, video: false },
        ];

    let lastErr: unknown = null;

    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream && (stream.getAudioTracks().length > 0 || stream.getVideoTracks().length > 0)) {
          return stream;
        }
        // Defensive: a stream with zero usable tracks is not usable.
        stream?.getTracks().forEach((t) => t.stop());
      } catch (err) {
        lastErr = err;
        console.warn('getUserMedia attempt failed:', constraints, err);
      }
    }

    throw lastErr ?? new Error('No usable microphone or camera was found.');
  }

  /**
   * Re-attempt local media capture while a call is already live, then hot-swap
   * the tracks into the existing peer connection. Backs the "Retry" button in
   * the call UI: users routinely click "Block" on the first permission prompt,
   * and previously there was no way to recover without hanging up.
   */
  public async retryLocalMedia(): Promise<boolean> {
    if (!this.currentCall) return false;

    this.currentCall.mediaError = null;
    this.notifyCallState();

    try {
      const stream = await this.getUserMediaStream(this.currentCall.callType === 'video');

      // Release whatever the previous attempt left open.
      if (this.localStream && this.localStream !== stream) {
        this.localStream.getTracks().forEach((t) => t.stop());
      }

      this.localStream = stream;
      this.currentCall.localStream = stream;
      this.currentCall.isVideoOff = stream.getVideoTracks().length === 0;
      this.currentCall.isMuted = false;
      this.currentCall.mediaError = null;

      if (this.peerConnection && this.peerConnection.signalingState !== 'closed') {
        const senders = this.peerConnection.getSenders();
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];

        // Replace matching senders in place, add anything the peer connection
        // does not already carry.
        for (const sender of senders) {
          if (sender.track?.kind === 'audio' && audioTrack) {
            await sender.replaceTrack(audioTrack);
          } else if (sender.track?.kind === 'video' && videoTrack) {
            await sender.replaceTrack(videoTrack);
          }
        }

        const hasAudioSender = senders.some((s) => s.track?.kind === 'audio');
        const hasVideoSender = senders.some((s) => s.track?.kind === 'video');

        if (audioTrack && !hasAudioSender) this.peerConnection.addTrack(audioTrack, stream);
        if (videoTrack && !hasVideoSender) this.peerConnection.addTrack(videoTrack, stream);

        // Renegotiate so the peer actually sees the new tracks.
        try {
          const offer = await this.peerConnection.createOffer();
          await this.peerConnection.setLocalDescription(offer);
          this.socket?.emit('call:signal', {
            callId: this.currentCall.callId,
            targetUserId: this.currentCall.targetUser.id,
            signal: offer,
          });
        } catch (renegErr) {
          console.warn('Renegotiation after media retry failed:', renegErr);
        }
      }

      this.notifyCallState();
      return true;
    } catch (err) {
      console.warn('Media retry failed:', err);
      if (this.currentCall) {
        this.currentCall.mediaError = describeMediaError(err);
        this.notifyCallState();
      }
      return false;
    }
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

    // Remote media.
    //
    // The old handler only looked at `event.streams[0]`. Firefox (and Chrome in
    // some renegotiation paths) fires ontrack with an empty `streams` array and
    // populates `event.track` instead, so this.remoteStream stayed null, the
    // <video> element never received a srcObject, and the user saw the
    // "Connecting camera stream..." placeholder forever. We now build the
    // stream ourselves from event.track when no stream is supplied.
    this.peerConnection.ontrack = (event) => {
      let stream = event.streams?.[0];

      if (!stream) {
        stream = this.remoteStream ?? new MediaStream();
        if (event.track && !stream.getTrackById(event.track.id)) {
          stream.addTrack(event.track);
        }
      }

      this.remoteStream = stream;

      if (this.currentCall) {
        this.currentCall.remoteStream = stream;
        this.currentCall.isConnecting = false;
        this.notifyCallState();
      }
    };

    // Surface transport-level failures instead of letting the call hang.
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (!state) return;

      if (state === 'failed' || state === 'disconnected') {
        console.warn(`WebRTC connection ${state}.`);
        if (this.currentCall) {
          this.currentCall.isConnecting = state === 'disconnected';
          this.notifyCallState();
        }
        if (state === 'failed') {
          soundEffects.playBusyTone();
          this.endCallInternal(true);
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

  /** Flush any ICE candidates that arrived before the remote description. */
  private async flushPendingIceCandidates() {
    if (!this.peerConnection || this.pendingIceCandidates.length === 0) return;

    const queued = this.pendingIceCandidates;
    this.pendingIceCandidates = [];

    for (const candidate of queued) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Error flushing queued ICE candidate:', err);
      }
    }
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

  /**
   * Broadcast a profile change (name, phone, avatar...) to every other
   * connected device. This is independent of the Postgres write, so picture
   * updates still reach other users when the database is unavailable.
   */
  public emitUserProfileUpdate(userData: any) {
    this.socket?.emit('profile:broadcast', userData);
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
