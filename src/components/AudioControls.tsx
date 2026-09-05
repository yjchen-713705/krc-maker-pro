import { Slider, Button, Space, Tooltip } from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  MutedOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useLyricStore } from '@/store/lyricStore'

function formatTime(ms: number): string {
  if (ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function AudioControls() {
  const { playState, audioFileName } = useLyricStore()
  const { togglePlay, seek, setVolume } = useAudioEngine()
  const [volume, setVolumeLocal] = useState(1)
  const [muted, setMuted] = useState(false)

  const handleSeek = (value: number) => {
    seek(value)
  }

  const handleVolumeChange = (value: number) => {
    setVolumeLocal(value)
    setVolume(value)
    if (value > 0 && muted) {
      setMuted(false)
    }
  }

  const toggleMute = () => {
    if (muted) {
      setVolume(volume || 0.5)
      setMuted(false)
    } else {
      setVolume(0)
      setMuted(true)
    }
  }

  return (
    <div
      style={{
        padding: '12px 24px',
        borderTop: '1px solid #f0f0f0',
        background: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <Button
        type="text"
        size="large"
        icon={
          playState.isPlaying ? (
            <PauseCircleOutlined style={{ fontSize: 32 }} />
          ) : (
            <PlayCircleOutlined style={{ fontSize: 32 }} />
          )
        }
        onClick={togglePlay}
        disabled={!audioFileName}
      />

      <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#555', width: 90, textAlign: 'right' }}>
        {formatTime(playState.currentTime)}
      </span>

      <Slider
        min={0}
        max={playState.duration || 1}
        value={Math.min(playState.currentTime, playState.duration || 0)}
        onChange={handleSeek}
        style={{ flex: 1, margin: '0 8px' }}
        disabled={!audioFileName}
        tooltip={{ formatter: (v) => formatTime(v ?? 0) }}
      />

      <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#555', width: 90 }}>
        {formatTime(playState.duration)}
      </span>

      <Space size={8} style={{ marginLeft: 8 }}>
        <Tooltip title={muted ? '取消静音' : '静音'}>
          <Button
            type="text"
            size="small"
            icon={muted || volume === 0 ? <MutedOutlined /> : <SoundOutlined />}
            onClick={toggleMute}
          />
        </Tooltip>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={handleVolumeChange}
          style={{ width: 100 }}
        />
      </Space>

      {audioFileName && (
        <span style={{ marginLeft: 8, color: '#999', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {audioFileName}
        </span>
      )}
    </div>
  )
}