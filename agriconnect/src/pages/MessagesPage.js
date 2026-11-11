import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaPaperPlane } from 'react-icons/fa';
import api from '../services/api';
import { toast } from 'react-toastify';

const MessagesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate(); // eslint-disable-line no-unused-vars
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data.conversations || []);
    } catch { setConversations([]); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = async (partnerId) => {
    try {
      const res = await api.get(`/messages/${partnerId}`);
      setMessages(res.data.messages || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { setMessages([]); }
  };

  const selectConversation = (conv) => {
    setActivePartner(conv.partner);
    loadMessages(conv.partnerId);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activePartner) return;
    setSending(true);
    try {
      await api.post('/messages', { receiver_id: activePartner.id, content: newMessage });
      setNewMessage('');
      loadMessages(activePartner.id);
      loadConversations();
    } catch { toast.error('Failed to send message.'); }
    finally { setSending(false); }
  };

  return (
    <>
      <div className="page-header">
        <Container>
          <h1 className="section-title mb-1">Direct Communication Channel</h1>
          <p className="section-subtitle mb-0">Producer-buyer inquiries and trade negotiation logs</p>
        </Container>
      </div>

      <Container className="pb-5">
        <div className="ag-card" style={{ overflow: 'hidden' }}>
          <div className="chat-container">
            {/* Sidebar Directory */}
            <div className="chat-sidebar">
              <div className="p-3 border-bottom border-secondary small text-secondary fw-semibold text-uppercase" style={{ borderColor: 'var(--border-color) !important', letterSpacing: '0.05em' }}>
                Active Threads ({conversations.length})
              </div>
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-muted small">
                  No active trade inquiries.<br />Inquiries initiated from produce listings appear here.
                </div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.partnerId}
                    onClick={() => selectConversation(conv)}
                    className="p-3 border-bottom border-secondary"
                    style={{
                      cursor: 'pointer',
                      background: activePartner?.id === conv.partnerId ? 'var(--bg-card-hover)' : 'transparent',
                      borderLeft: activePartner?.id === conv.partnerId ? '2px solid var(--color-primary-lt)' : '2px solid transparent',
                      borderColor: 'var(--border-color) !important',
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small fw-semibold text-white">{conv.partner?.name}</span>
                      {conv.unreadCount > 0 && (
                        <span className="badge bg-success" style={{ fontSize: '0.65rem' }}>{conv.unreadCount}</span>
                      )}
                    </div>
                    <div className="small text-muted text-truncate" style={{ fontSize: '0.75rem' }}>
                      {conv.lastMessage}
                    </div>
                    <div className="small text-secondary mt-1" style={{ fontSize: '0.7rem' }}>
                      Station: {conv.partner?.location}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Thread */}
            <div className="chat-window">
              {!activePartner ? (
                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-muted small p-4">
                  Select a communication thread to review logs and respond
                </div>
              ) : (
                <>
                  {/* Thread Header */}
                  <div className="p-3 border-bottom border-secondary d-flex justify-content-between align-items-center" style={{ borderColor: 'var(--border-color) !important' }}>
                    <div>
                      <div className="small fw-semibold text-white">{activePartner.name}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>District: {activePartner.location}</div>
                    </div>
                  </div>

                  {/* Message Stream */}
                  <div className="chat-messages">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted small py-4">
                        Initial communication channel established with {activePartner.name}
                      </div>
                    ) : (
                      messages.map(msg => (
                        <div key={msg.id} className={`msg-bubble ${msg.sender_id === user.id ? 'msg-sent' : 'msg-received'}`}>
                          {msg.listing && (
                            <div className="small text-muted mb-1" style={{ fontSize: '0.7rem' }}>
                              Reference: {msg.listing.crop_name}
                            </div>
                          )}
                          <div>{msg.content}</div>
                          <div className="small text-muted mt-1" style={{ fontSize: '0.65rem', textAlign: msg.sender_id === user.id ? 'right' : 'left' }}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Transmission Form */}
                  <form onSubmit={handleSend} className="chat-input-row">
                    <input
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder={`Transmit reply to ${activePartner.name}...`}
                      className="ag-form-control flex-grow-1"
                    />
                    <button type="submit" disabled={sending || !newMessage.trim()} className="btn-ag-primary">
                      <FaPaperPlane size={11} className="me-1" /> Send
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </Container>
    </>
  );
};

export default MessagesPage;
