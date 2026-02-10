import React, { useState, useEffect } from 'react';
import { signOut, fetchUserAttributes } from 'aws-amplify/auth';
import { videoAPI } from '../../services/api';
import VideoTable from './VideoTable';
import UploadModal from './UploadModal';
import LogsModal from './LogsModal';
import NotificationIcon from './NotificationIcon';
import './Dashboard.css';

const Dashboard = ({ onSignOut }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    loadUserData();
    loadVideos();
  }, []);

  const loadUserData = async () => {
    try {
      const attributes = await fetchUserAttributes();
      setUserName(attributes.name || attributes.email || 'Usuário');
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const loadVideos = async () => {
    console.log('loadVideos called');
    setLoading(true);
    setError('');
    try {
      console.log('Calling videoAPI.getVideos()...');
      const data = await videoAPI.getVideos();
      console.log('Received data:', data);
      setVideos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('Erro ao carregar vídeos. Tente novamente.');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onSignOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    loadVideos();
  };

  const handleDownload = async (video) => {
    try {
      await videoAPI.downloadVideo(video.id);
    } catch (err) {
      console.error('Error downloading video:', err);
      alert('Erro ao baixar vídeo. Tente novamente.');
    }
  };

  const handleViewLogs = (video) => {
    setSelectedVideo(video);
    setShowLogsModal(true);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <img src="/logo_ico.png" alt="Video Slice" className="dashboard-logo" />
            <h1>Video Slice - Dashboard</h1>
          </div>
          <div className="user-info">
            <span className="user-name">Olá, {userName}</span>
            <NotificationIcon />
            <button className="btn-logout" onClick={handleSignOut}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-actions">
          <button 
            className="btn-upload"
            onClick={() => setShowUploadModal(true)}
          >
            + Upload Novo Vídeo
          </button>
          <button 
            className="btn-refresh"
            onClick={loadVideos}
            disabled={loading}
          >
            🔄 Atualizar
          </button>
        </div>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        <VideoTable 
          videos={videos}
          loading={loading}
          onDownload={handleDownload}
          onViewLogs={handleViewLogs}
        />
      </main>

      {showUploadModal && (
        <UploadModal 
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {showLogsModal && selectedVideo && (
        <LogsModal
          video={selectedVideo}
          onClose={() => setShowLogsModal(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
