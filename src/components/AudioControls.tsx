import { Slider, Button, Space, Tooltip, theme } from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  MutedOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useLyricStore } from '@/store/lyricStore'
import { formatTimeDisplay } from '@shared/utils'

export function AudioControls() {
  const { token } = theme.useToken()
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
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgLayout,
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

      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 13,
          color: token.colorTextSecondary,
          width: 90,
          textAlign: 'right',
        }}
      >
        {formatTimeDisplay(playState.currentTime)}
      </span>

      <Slider
        min={0}
        max={playState.duration || 1}
        value={Math.min(playState.currentTime, playState.duration || 0)}
        onChange={handleSeek}
        style={{ flex: 1, margin: '0 8px' }}
        disabled={!audioFileName}
        tooltip={{ formatter: (v) => formatTimeDisplay(v ?? 0) }}
      />

      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 13,
          color: token.colorTextSecondary,
          width: 90,
        }}
      >
        {formatTimeDisplay(playState.duration)}
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
        <span
          style={{
            marginLeft: 8,
            color: token.colorTextTertiary,
            fontSize: 12,
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {audioFileName}
        </span>
      )}
    </div>
  )
}