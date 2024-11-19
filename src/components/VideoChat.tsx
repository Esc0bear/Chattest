import React, { useEffect, useRef, useState } from 'react';
import SimplePeer from 'simple-peer';
import { socket } from '../socket';
import { Send, Video, VideoOff } from 'lucide-react';

interface VideoChatProps {
  room: string;
}

interface Message {
  text: string;
  isSelf: boolean;
  timestamp: number;
}

export default function VideoChat({ room }: VideoChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !peerRef.current || !connected) return;

    const messageData = {
      text: inputMessage,
      timestamp: Date.now()
    };

    try {
      peerRef.current.send(JSON.stringify(messageData));
      setMessages(prev => [...prev, { ...messageData, isSelf: true }]);
      setInputMessage('');

      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  };

  useEffect(() => {
    let peer: SimplePeer.Instance | null = null;
    let stream: MediaStream | null = null;

    const initializeConnection = async () => {
      try {
        // Get media stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize peer connection
        const [, firstId] = room.split('_');
        const isInitiator = socket.id === firstId;

        peer = new SimplePeer({
          initiator: isInitiator,
          stream,
          trickle: false
        });

        peerRef.current = peer;

        // Handle signaling
        peer.on('signal', signal => {
          console.log('📤 Sending signal');
          socket.emit('signal', { signal, room });
        });

        peer.on('connect', () => {
          console.log('🤝 Peer Connected');
          setConnected(true);
          setError(null);
        });

        peer.on('stream', remoteStream => {
          console.log('📺 Received remote stream');
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(err => {
              console.error('Error playing remote video:', err);
            });
          }
        });

        peer.on('data', data => {
          try {
            const message = JSON.parse(data.toString());
            setMessages(prev => [...prev, { 
              text: message.text, 
              isSelf: false, 
              timestamp: message.timestamp 
            }]);

            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          } catch (err) {
            console.error('Error parsing message:', err);
          }
        });

        peer.on('error', err => {
          console.error('❌ Peer error:', err);
          setError('Erreur de connexion');
        });

        peer.on('close', () => {
          console.log('👋 Peer connection closed');
          setConnected(false);
          setError('Connexion terminée');
        });

        // Handle incoming signals
        socket.on('signal', ({ signal }) => {
          console.log('📡 Received signal');
          try {
            peer?.signal(signal);
          } catch (err) {
            console.error('Error processing signal:', err);
          }
        });

        socket.on('peer_disconnected', () => {
          setConnected(false);
          setError('Partenaire déconnecté');
        });

      } catch (err) {
        console.error('Error in peer connection:', err);
        setError('Erreur d\'initialisation de la connexion');
      }
    };

    initializeConnection();

    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (peer) {
        peer.destroy();
      }
      socket.off('signal');
      socket.off('peer_disconnected');
    };
  }, [room]);

  return (
    <div className="max-w-4xl mx-auto w-full bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 bg-purple-600 text-white font-semibold flex justify-between items-center">
        <span>Chat en direct</span>
        <span className="text-sm">
          {error ? error : connected ? 'Connecté' : 'En attente de connexion...'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-100">
        <div className="relative">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-[300px] bg-black rounded-lg object-cover mirror"
          />
          <button
            onClick={toggleVideo}
            className="absolute bottom-4 right-4 bg-purple-600 p-2 rounded-full text-white hover:bg-purple-700"
          >
            {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
        </div>
        <div className="relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-[300px] bg-black rounded-lg object-cover"
          />
        </div>
      </div>
      
      <div 
        ref={chatContainerRef}
        className="flex-1 p-4 space-y-4 overflow-y-auto"
        style={{ height: '200px' }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.isSelf ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.isSelf
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p>{message.text}</p>
              <p className={`text-xs mt-1 ${message.isSelf ? 'text-purple-200' : 'text-gray-500'}`}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500"
            disabled={!connected}
          />
          <button
            type="submit"
            disabled={!connected || !inputMessage.trim()}
            className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}