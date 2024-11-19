import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { socket } from './socket';
import VideoChat from './components/VideoChat';

const App: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [room, setRoom] = useState<string | null>(null);

  useEffect(() => {
    socket.on('chat_started', ({ room }) => {
      setRoom(room);
      setIsConnecting(false);
    });

    return () => {
      socket.off('chat_started');
    };
  }, []);

  const startChat = () => {
    setIsConnecting(true);
    socket.emit('start_chat');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="container mx-auto">
        {!room ? (
          <div className="max-w-2xl mx-auto text-center text-white">
            <h1 className="text-5xl font-bold mb-4">Random Chat</h1>
            <p className="text-xl mb-8">Discutez avec des inconnus</p>
            
            {!isConnecting ? (
              <button
                onClick={startChat}
                className="bg-white text-purple-600 px-8 py-4 rounded-full text-xl font-semibold hover:bg-opacity-90 transition-all shadow-lg flex items-center gap-2 mx-auto"
              >
                <MessageSquare className="w-6 h-6" />
                Start Chat
              </button>
            ) : (
              <div className="animate-pulse text-xl">
                Recherche d'un partenaire de chat...
              </div>
            )}
          </div>
        ) : (
          <VideoChat room={room} />
        )}
      </div>
    </div>
  );
};

export default App;