import React from 'react';
import './LogsModal.css';

const LogsModal = ({ video, onClose }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  // Ordena logs em ordem crescente de timestamp
  const sortedLogs = video.logs && Array.isArray(video.logs)
    ? [...video.logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content logs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Logs do Vídeo: {video.fileName}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body logs-body">
          {sortedLogs.length === 0 ? (
            <div className="empty-logs">
              <p>Nenhum log disponível para este vídeo.</p>
            </div>
          ) : (
            <div className="logs-list">
              {sortedLogs.map((log, index) => (
                <div key={index} className="log-entry">
                  <div className="log-timestamp">
                    {formatDate(log.timestamp)}
                  </div>
                  <div className="log-message">
                    {log.info}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogsModal;
