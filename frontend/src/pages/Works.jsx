import { useEffect, useState } from 'react';
import api from '../api';
import '../styles/Works.css';

function Works() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadVideos = () => {
    setLoading(true);
    setError('');

    api
      .get('/api/videos/')
      .then((res) => setVideos(res.data))
      .catch(() => setError('讀取作品時發生錯誤，請稍後再試。'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const deleteVideo = async (videoId) => {
    const confirmed = window.confirm('您確認要刪除影片?');

    if (!confirmed) return;

    try {
      await api.delete(`/api/videos/delete/${videoId}/`);
      setVideos((currentVideos) => currentVideos.filter((video) => video.id !== videoId));
    } catch {
      alert('刪除影片失敗，請稍後再試。');
    }
  };

  const renderSection = (title, format, items) => (
    <section className="work-group">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="works-group-message">目前沒有儲存的影片。</p>
      ) : (
        <div className={`works-grid works-grid--${format}`}>
          {items.map((video) => (
            <article className={`work-card work-card--${format}`} key={video.id}>
              <video src={video.video_url} controls />
              <button type="button" onClick={() => deleteVideo(video.id)}>
                刪除影片
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const shortVideos = videos.filter((video) => video.video_format === 'short');
  const longVideos = videos.filter((video) => video.video_format !== 'short');

  return (
    <main className="works-page">
      <section className="works-panel">
        {loading && <p className="works-message">載入中...</p>}
        {error && <p className="works-error">{error}</p>}
        {!loading && !error && videos.length === 0 && (
          <p className="works-message">目前還沒有儲存的影片。</p>
        )}
        {!loading && !error && renderSection('短影片', 'short', shortVideos)}
        {!loading && !error && renderSection('長影片', 'long', longVideos)}
      </section>
    </main>
  );
}

export default Works;
