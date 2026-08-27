/**
 * WebRTC 1-to-1 Voice & Video Call Overlay Component
 * Provides real-time audio/video interface, call duration timer,
 * microphone mute, camera toggle, and incoming call banner.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { socketService, WebRTCCallState } from '../../services/socketService';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  User,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Volume2,
} from 'lucide-react';

export const WebRTCCallModal: React.FC = () => {
  const { currentUser } = useApp();
  const [callState, setCallState] = useState<WebRTCCallState | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Listen to call state changes from socketService
    const unsubscribe = socketService.onCallStateChange((state) => {
      setCallState(state);
    });
    return () => unsubscribe();
  }, []);

  // Bind media streams to HTML Video elements
  useEffect(() => {
    if (callState?.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = callState.localStream;
    }
  }, [callState?.localStream]);

  useEffect(() => {
    if (callState?.remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = callState.remoteStream;
    }
  }, [callState?.remoteStream]);

  if (!callState || !currentUser) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. INCOMING CALL BANNER / POPUP
  if (callState.isIncoming && !callState.isConnected) {
    return (
      <div className="fixed inset-x-4 top-6 md:inset-x-auto md:right-8 md:top-8 z-[200] max-w-md w-full animate-bounce duration-700">
        <div className="p-5 rounded-2xl bg-slate-900 text-white border-2 border-emerald-500 shadow-2xl shadow-emerald-950/60 backdrop-blur-xl flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {callState.targetUser.avatarUrl ? (
                <img
                  src={callState.targetUser.avatarUrl}
                  alt={callState.targetUser.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-emerald-400"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-emerald-950 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 font-bold text-xl">
                  {callState.targetUser.name.charAt(0)}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] animate-pulse">
                {callState.callType === 'video' ? <Video className="w-3 h-3 text-white" /> : <Phone className="w-3 h-3 text-white" />}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Incoming Pure Max {callState.callType === 'video' ? 'Video Call' : 'Voice Call'}
              </span>
              <h4 className="text-base font-black truncate text-white">{callState.targetUser.name}</h4>
              <p className="text-xs text-slate-300 capitalize">{callState.targetUser.role.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => socketService.rejectCall()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              Decline
            </button>

            <button
              onClick={() => socketService.acceptCall({ id: currentUser.id, name: currentUser.name })}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition cursor-pointer"
            >
              {callState.callType === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              Accept Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE OR OUTGOING CALL OVERLAY
  return (
    <div
      className={`fixed z-[200] transition-all duration-300 ${
        isMinimized
          ? 'bottom-6 right-6 w-80 shadow-2xl rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 text-white'
          : 'inset-0 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md'
      }`}
    >
      <div
        className={`w-full ${
          isMinimized
            ? 'p-4'
            : 'max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white flex flex-col justify-between'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Pure Max {callState.callType === 'video' ? 'Video Call' : 'Encrypted Voice Call'}
            </span>
          </div>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Video or Voice Canvas */}
        {callState.callType === 'video' ? (
          <div className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center mb-4">
            {/* Remote Video Stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {!callState.remoteStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 gap-3">
                <div className="w-20 h-20 rounded-full bg-indigo-950 border-2 border-indigo-500 flex items-center justify-center text-indigo-300 text-3xl font-extrabold">
                  {callState.targetUser.name.charAt(0)}
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-base">{callState.targetUser.name}</h4>
                  <p className="text-xs text-slate-400">
                    {callState.isConnected ? 'Video connected' : 'Connecting camera stream...'}
                  </p>
                </div>
              </div>
            )}

            {/* Local Video Picture-in-Picture */}
            <div className="absolute bottom-3 right-3 w-32 aspect-video bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-700 shadow-xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${callState.isVideoOff ? 'hidden' : 'block'}`}
              />
              {callState.isVideoOff && (
                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-[10px] text-slate-400">
                  Camera Off
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              {callState.targetUser.avatarUrl ? (
                <img
                  src={callState.targetUser.avatarUrl}
                  alt={callState.targetUser.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-indigo-500 shadow-xl"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-indigo-950 border-4 border-indigo-500 flex items-center justify-center text-indigo-300 text-4xl font-black shadow-xl">
                  {callState.targetUser.name.charAt(0)}
                </div>
              )}
              {callState.isConnected && (
                <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-500 border-2 border-slate-900">
                  <Volume2 className="w-4 h-4 text-white animate-pulse" />
                </span>
              )}
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white">{callState.targetUser.name}</h3>
              <p className="text-xs text-indigo-300 font-mono capitalize">{callState.targetUser.role.replace('_', ' ')}</p>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-emerald-400 font-bold">
                {callState.isConnected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    {formatDuration(callState.callDurationSeconds)}
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    Calling peer...
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-800">
          <button
            onClick={() => socketService.toggleMute()}
            className={`p-3.5 rounded-full transition cursor-pointer ${
              callState.isMuted
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title={callState.isMuted ? 'Unmute' : 'Mute'}
          >
            {callState.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {callState.callType === 'video' && (
            <button
              onClick={() => socketService.toggleVideo()}
              className={`p-3.5 rounded-full transition cursor-pointer ${
                callState.isVideoOff
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={callState.isVideoOff ? 'Turn on Camera' : 'Turn off Camera'}
            >
              {callState.isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={() => socketService.endCall()}
            className="px-6 py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition cursor-pointer"
          >
            <PhoneOff className="w-5 h-5" />
            End Call
          </button>
        </div>
      </div>
    </div>
  );
};
