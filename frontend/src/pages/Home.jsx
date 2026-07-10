import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/Home.css';

const fallbackVoices = [
  { id: 'zh-TW-HsiaoChenNeural', name: '曉臻（台灣女聲）' },
  { id: 'zh-TW-YunJheNeural', name: '雲哲（台灣男聲）' },
  { id: 'zh-CN-XiaoxiaoNeural', name: '曉曉（中文女聲）' },
  { id: 'zh-CN-YunxiNeural', name: '雲希（中文男聲）' },
  { id: 'en-US-JennyNeural', name: 'Jenny（英文女聲）' },
  { id: 'en-US-GuyNeural', name: 'Guy（英文男聲）' },
];

const createEmptySegment = () => ({
  text: '',
  status: 'idle',
  audioUrl: '',
  duration: 0,
  size: 0,
  keyword: '',
  materialStatus: 'idle',
  material: null,
  materialIds: [],
  showMaterial: false,
  error: '',
  materialError: '',
});

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 KB';

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const getTrimmedVideoUrl = (videoUrl, trimEnd) => `${videoUrl}#t=0,${trimEnd}`;

const videoFormats = [
  { id: 'short', name: '短影片' },
  { id: 'long', name: '長影片' },
];

function Home() {
  const navigate = useNavigate();
  const [voice, setVoice] = useState(fallbackVoices[0].id);
  const [videoFormat, setVideoFormat] = useState('long');
  const [voices, setVoices] = useState(fallbackVoices);
  const [pixabayKey, setPixabayKey] = useState('');
  const [extraSegmentCount, setExtraSegmentCount] = useState(0);
  const [segmentCount, setSegmentCount] = useState(1);
  const [segments, setSegments] = useState([createEmptySegment()]);
  const [composeStatus, setComposeStatus] = useState('idle');
  const [composeError, setComposeError] = useState('');
  const [resultVideoUrl, setResultVideoUrl] = useState('');
  const [resultVideoBlob, setResultVideoBlob] = useState(null);
  const segmentsRef = useRef(segments);
  const resultVideoUrlRef = useRef(resultVideoUrl);

  useEffect(() => {
    api
      .get('/api/tts/voices/')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setVoices(res.data);
          setVoice(res.data[0].id);
        }
      })
      .catch(() => {
        setVoices(fallbackVoices);
      });
  }, []);

  useEffect(() => {
    setSegments((currentSegments) => {
      const nextSegments = currentSegments.slice(0, segmentCount);

      while (nextSegments.length < segmentCount) {
        nextSegments.push(createEmptySegment());
      }

      currentSegments.slice(segmentCount).forEach((segment) => {
        if (segment.audioUrl) URL.revokeObjectURL(segment.audioUrl);
      });

      return nextSegments;
    });
  }, [segmentCount]);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    resultVideoUrlRef.current = resultVideoUrl;
  }, [resultVideoUrl]);

  useEffect(() => {
    return () => {
      segmentsRef.current.forEach((segment) => {
        if (segment.audioUrl) URL.revokeObjectURL(segment.audioUrl);
      });

      if (resultVideoUrlRef.current) {
        URL.revokeObjectURL(resultVideoUrlRef.current);
      }
    };
  }, []);

  const resetResultVideo = () => {
    if (resultVideoUrlRef.current) {
      URL.revokeObjectURL(resultVideoUrlRef.current);
    }

    setResultVideoUrl('');
    setResultVideoBlob(null);
    setComposeStatus('idle');
    setComposeError('');
  };

  const updateSegmentText = (index, text) => {
    resetResultVideo();
    setSegments((currentSegments) =>
      currentSegments.map((segment, segmentIndex) => {
        if (segmentIndex !== index) return segment;
        if (segment.audioUrl) URL.revokeObjectURL(segment.audioUrl);

        return {
          ...segment,
          text,
          status: 'idle',
          audioUrl: '',
          duration: 0,
          size: 0,
          materialStatus: 'idle',
          material: null,
          materialIds: [],
          showMaterial: false,
          error: '',
          materialError: '',
        };
      }),
    );
  };

  const updateSegmentKeyword = (index, keyword) => {
    resetResultVideo();
    setSegments((currentSegments) =>
      currentSegments.map((segment, segmentIndex) =>
        segmentIndex === index
          ? {
              ...segment,
              keyword,
              materialStatus: 'idle',
              material: null,
              materialIds: [],
              showMaterial: false,
              materialError: '',
            }
          : segment,
      ),
    );
  };

  const updateSegmentState = (index, nextValues) => {
    setSegments((currentSegments) =>
      currentSegments.map((segment, segmentIndex) =>
        segmentIndex === index ? { ...segment, ...nextValues } : segment,
      ),
    );
  };

  const getAudioDuration = (audioUrl) =>
    new Promise((resolve) => {
      const audio = new Audio(audioUrl);
      audio.addEventListener('loadedmetadata', () => resolve(audio.duration), { once: true });
      audio.addEventListener('error', () => resolve(0), { once: true });
    });

  const generateSegmentAudio = async (index) => {
    resetResultVideo();
    const segment = segments[index];

    if (!segment.text.trim()) {
      updateSegmentState(index, { error: '請先輸入片段內容。' });
      return;
    }

    updateSegmentState(index, { status: 'generating', error: '' });

    try {
      const res = await api.post(
        '/api/tts/',
        { text: segment.text, voice },
        { responseType: 'blob' },
      );
      const audioUrl = URL.createObjectURL(res.data);
      const duration = await getAudioDuration(audioUrl);

      updateSegmentState(index, {
        status: 'ready',
        audioUrl,
        duration,
        size: res.data.size,
        materialStatus: 'idle',
        material: null,
        showMaterial: false,
        error: '',
        materialError: '',
      });
    } catch (error) {
      let errorMessage = '音檔生成失敗，請稍後再試。';

      if (error.response?.data instanceof Blob) {
        const text = await error.response.data.text();

        try {
          errorMessage = JSON.parse(text).detail || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      updateSegmentState(index, { status: 'idle', error: errorMessage });
    }
  };

  const playSegmentAudio = (audioUrl) => {
    const audio = new Audio(audioUrl);
    audio.play();
  };

  const handleSegmentAction = (index) => {
    const segment = segments[index];

    if (segment.audioUrl) {
      playSegmentAudio(segment.audioUrl);
      return;
    }

    generateSegmentAudio(index);
  };

  const searchMaterial = async (index, replace = false) => {
    const segment = segments[index];

    if (segment.material && !replace) {
      updateSegmentState(index, { showMaterial: !segment.showMaterial, materialError: '' });
      return;
    }

    if (!segment.audioUrl || !segment.duration) {
      updateSegmentState(index, { materialError: '請先生成音檔。' });
      return;
    }

    if (!pixabayKey.trim()) {
      updateSegmentState(index, { materialError: '請先輸入 Pixabay API Key。' });
      return;
    }

    if (!segment.keyword.trim()) {
      updateSegmentState(index, { materialError: '請輸入素材關鍵字。' });
      return;
    }

    resetResultVideo();
    updateSegmentState(index, { materialStatus: 'searching', materialError: '' });

    try {
      const res = await api.post('/api/pixabay/video/', {
        keyword: segment.keyword,
        min_duration: segment.duration,
        pixabay_key: pixabayKey,
        exclude_ids: segment.materialIds,
      });

      updateSegmentState(index, {
        materialStatus: 'ready',
        material: res.data,
        materialIds: [...segment.materialIds, res.data.id],
        showMaterial: true,
        materialError: '',
      });
    } catch (error) {
      updateSegmentState(index, {
        materialStatus: 'idle',
        materialError: error.response?.data?.detail || '素材搜尋失敗，請稍後再試。',
      });
    }
  };

  const composeVideo = async () => {
    setComposeStatus('composing');
    setComposeError('');

    const invalidSegmentIndex = segments.findIndex(
      (segment) => !segment.text.trim() || !segment.audioUrl || !segment.material?.videoUrl,
    );

    if (invalidSegmentIndex >= 0) {
      setComposeStatus('idle');
      setComposeError(`片段 ${invalidSegmentIndex + 1} 需要先生成音檔並選擇素材。`);
      return;
    }

    try {
      const res = await api.post(
        '/api/video/compose/',
        {
          voice,
          video_format: videoFormat,
          segments: segments.map((segment) => ({
            text: segment.text,
            duration: segment.duration,
            videoUrl: segment.material.videoUrl,
          })),
        },
        { responseType: 'blob' },
      );
      const videoUrl = URL.createObjectURL(res.data);

      if (resultVideoUrlRef.current) {
        URL.revokeObjectURL(resultVideoUrlRef.current);
      }

      setResultVideoUrl(videoUrl);
      setResultVideoBlob(res.data);
      setComposeStatus('ready');
    } catch (error) {
      let errorMessage = '影片合成失敗，請稍後再試。';

      if (error.response?.data instanceof Blob) {
        const text = await error.response.data.text();

        try {
          errorMessage = JSON.parse(text).detail || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      setComposeStatus('idle');
      setComposeError(errorMessage);
    }
  };

  const saveVideo = async () => {
    if (!resultVideoBlob) return;

    const formData = new FormData();
    formData.append('title', `合成影片 ${new Date().toLocaleString('zh-TW')}`);
    formData.append('video', resultVideoBlob, `video-${Date.now()}.mp4`);
    formData.append('video_format', videoFormat);

    try {
      await api.post('/api/videos/', formData);
      alert('您已儲存影片');
      navigate('/works');
    } catch (error) {
      alert(error.response?.data?.detail || '影片儲存失敗，請稍後再試。');
    }
  };

  const handleExtraSegmentCount = (value) => {
    const nextValue = Number(value);

    if (Number.isNaN(nextValue)) {
      setExtraSegmentCount(0);
      return;
    }

    setExtraSegmentCount(Math.min(20, Math.max(0, nextValue)));
  };

  const applySegmentCount = () => {
    const nextSegmentCount = extraSegmentCount + 1;

    if (nextSegmentCount === segmentCount) return;

    resetResultVideo();
    setSegmentCount(nextSegmentCount);
  };

  const getMaterialButtonText = (segment) => {
    if (segment.materialStatus === 'searching') return '搜尋中...';
    if (segment.material) return segment.showMaterial ? '隱藏素材' : '觀看素材';
    return '選擇素材';
  };

  const handleMaterialPlay = (event) => {
    if (event.currentTarget.currentTime > 0.1) {
      event.currentTarget.currentTime = 0;
    }
  };

  const handleMaterialTimeUpdate = (event, trimEnd) => {
    if (event.currentTarget.currentTime >= trimEnd) {
      event.currentTarget.pause();
      event.currentTarget.currentTime = 0;
    }
  };

  const handleMaterialLoadedMetadata = (event) => {
    event.currentTarget.currentTime = 0;
  };

  return (
    <main className="workspace-page">
      <section className="task-form">
        <aside className="settings-panel">
          <label htmlFor="videoFormat">選擇影片尺寸</label>
          <select
            id="videoFormat"
            name="videoFormat"
            value={videoFormat}
            onChange={(e) => {
              resetResultVideo();
              setVideoFormat(e.target.value);
            }}
          >
            {videoFormats.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <label htmlFor="voice">選擇聲音</label>
          <select
            id="voice"
            name="voice"
            value={voice}
            onChange={(e) => {
              resetResultVideo();
              setVoice(e.target.value);
            }}
            required
          >
            {voices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <label htmlFor="pixabayKey">登入 Pixabay</label>
          <div className="api-key-row">
            <input
              type="password"
              id="pixabayKey"
              name="pixabayKey"
              value={pixabayKey}
              onChange={(e) => setPixabayKey(e.target.value)}
              placeholder="輸入 Pixabay API Key"
              autoComplete="off"
            />
            <a
              className="pixabay-link"
              href="https://pixabay.com/api/docs/"
              target="_blank"
              rel="noreferrer"
            >
              登入
            </a>
          </div>

          <label htmlFor="segmentCount">新增片段數量</label>
          <div className="segment-count-row">
            <input
              type="number"
              id="segmentCount"
              name="segmentCount"
              value={extraSegmentCount}
              onChange={(e) => handleExtraSegmentCount(e.target.value)}
              min="0"
              max="20"
              step="1"
            />
            <button type="button" className="segment-add-button" onClick={applySegmentCount}>
              新增
            </button>
          </div>
        </aside>

        <section className="work-panel">
          <div className="segment-list">
            {segments.map((segment, index) => (
              <div className="segment-row" key={index}>
                <label htmlFor={`segment-${index}`}>片段 {index + 1}</label>
                <div className="segment-controls">
                  <input
                    type="text"
                    id={`segment-${index}`}
                    value={segment.text}
                    onChange={(e) => updateSegmentText(index, e.target.value)}
                    placeholder="請輸入這段旁白內容"
                  />
                  <button
                    type="button"
                    className="segment-button"
                    onClick={() => handleSegmentAction(index)}
                    disabled={segment.status === 'generating'}
                  >
                    {segment.status === 'generating'
                      ? '生成中...'
                      : segment.audioUrl
                        ? `${formatDuration(segment.duration)} / ${formatFileSize(segment.size)}`
                        : '生成音檔'}
                  </button>
                  <input
                    type="text"
                    className="keyword-input"
                    value={segment.keyword}
                    onChange={(e) => updateSegmentKeyword(index, e.target.value)}
                    placeholder="關鍵字"
                  />
                  <button
                    type="button"
                    className="material-button"
                    onClick={() => searchMaterial(index)}
                    disabled={segment.materialStatus === 'searching'}
                  >
                    {getMaterialButtonText(segment)}
                  </button>
                </div>
                {segment.error && <p className="segment-error">{segment.error}</p>}
                {segment.materialError && <p className="segment-error">{segment.materialError}</p>}
                {segment.showMaterial && segment.material && (
                  <div className="material-preview">
                    <video
                      src={getTrimmedVideoUrl(segment.material.videoUrl, segment.material.trimEnd)}
                      poster={segment.material.thumbnail}
                      controls
                      onLoadedMetadata={handleMaterialLoadedMetadata}
                      onPlay={handleMaterialPlay}
                      onTimeUpdate={(event) => handleMaterialTimeUpdate(event, segment.material.trimEnd)}
                    />
                    <button
                      type="button"
                      className="replace-material-button"
                      onClick={() => searchMaterial(index, true)}
                      disabled={segment.materialStatus === 'searching'}
                    >
                      更換素材
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="compose-panel">
            <button
              type="button"
              className="compose-button"
              onClick={composeVideo}
              disabled={composeStatus === 'composing'}
            >
              {composeStatus === 'composing' ? '合成中...' : '合成影片'}
            </button>
            {composeError && <p className="segment-error">{composeError}</p>}
            {resultVideoUrl && (
              <div className={`result-preview result-preview--${videoFormat}`}>
                <video src={resultVideoUrl} controls />
                <button type="button" className="save-video-button" onClick={saveVideo}>
                  儲存影片
                </button>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

export default Home;
