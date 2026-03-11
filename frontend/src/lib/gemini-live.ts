/**
 * Gemini Live API 연동 모듈
 * 실시간 음성 대화를 위한 WebSocket 연결 관리
 */

import { GoogleGenAI, Modality } from '@google/genai'

// Live API 모델 (Native Audio 지원)
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025'

// 오디오 설정
const AUDIO_CONFIG = {
  inputSampleRate: 16000,
  outputSampleRate: 24000,
  channelCount: 1,
}

export interface LiveSessionCallbacks {
  onOpen?: () => void
  onMessage?: (text: string) => void
  onAudio?: (audioData: ArrayBuffer) => void
  onAudioEnd?: () => void
  onError?: (error: Error) => void
  onClose?: () => void
  onInterrupted?: () => void
}

export interface LiveSession {
  send: (text: string) => void
  sendAudio: (audioData: ArrayBuffer) => void
  close: () => void
  isConnected: () => boolean
}

/**
 * Gemini Live API 세션 생성
 */
export async function createLiveSession(
  ephemeralToken: string,
  systemInstruction: string,
  callbacks: LiveSessionCallbacks
): Promise<LiveSession> {
  // Ephemeral Token으로 클라이언트 생성
  const ai = new GoogleGenAI({ apiKey: ephemeralToken })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let session: any = null
  let connected = false

  try {
    session = await ai.live.connect({
      model: LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO, Modality.TEXT],
        systemInstruction: systemInstruction,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Aoede', // 친근한 여성 목소리
            },
          },
        },
      },
      callbacks: {
        onopen: () => {
          connected = true
          callbacks.onOpen?.()
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onmessage: (message: any) => {
          // 인터럽트 처리
          if (message.serverContent?.interrupted) {
            callbacks.onInterrupted?.()
            return
          }

          // 모델 응답 처리
          if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
              // 텍스트 응답
              if (part.text) {
                callbacks.onMessage?.(part.text)
              }
              // 오디오 응답
              if (part.inlineData?.data) {
                const audioData = base64ToArrayBuffer(part.inlineData.data)
                callbacks.onAudio?.(audioData)
              }
            }
          }

          // 턴 완료 시 onAudioEnd 호출
          if (message.serverContent?.turnComplete) {
            callbacks.onAudioEnd?.()
          }
        },
        onerror: (error: ErrorEvent) => {
          connected = false
          callbacks.onError?.(new Error(error.message || 'WebSocket error'))
        },
        onclose: () => {
          connected = false
          callbacks.onClose?.()
        },
      },
    })
  } catch (error) {
    callbacks.onError?.(error as Error)
    throw error
  }

  return {
    send: (text: string) => {
      if (!session || !connected) return
      session.send({
        clientContent: {
          turns: [{ role: 'user', parts: [{ text }] }],
          turnComplete: true,
        },
      })
    },
    sendAudio: (audioData: ArrayBuffer) => {
      if (!session || !connected) return
      session.sendRealtimeInput({
        audio: {
          data: arrayBufferToBase64(audioData),
          mimeType: `audio/pcm;rate=${AUDIO_CONFIG.inputSampleRate}`,
        },
      })
    },
    close: () => {
      if (session) {
        session.close()
        connected = false
      }
    },
    isConnected: () => connected,
  }
}

/**
 * 마이크 오디오 스트림 시작
 */
export async function startMicrophoneStream(
  onAudioData: (data: ArrayBuffer) => void
): Promise<{ stop: () => void }> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: AUDIO_CONFIG.inputSampleRate,
      channelCount: AUDIO_CONFIG.channelCount,
      echoCancellation: true,
      noiseSuppression: true,
    },
  })

  const audioContext = new AudioContext({ sampleRate: AUDIO_CONFIG.inputSampleRate })
  const source = audioContext.createMediaStreamSource(stream)
  const processor = audioContext.createScriptProcessor(4096, 1, 1)

  processor.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0)
    // Float32 -> Int16 PCM 변환
    const pcmData = float32ToInt16(inputData)
    onAudioData(pcmData.buffer as ArrayBuffer)
  }

  source.connect(processor)
  processor.connect(audioContext.destination)

  return {
    stop: () => {
      processor.disconnect()
      source.disconnect()
      stream.getTracks().forEach((track) => track.stop())
      audioContext.close()
    },
  }
}

/**
 * 오디오 재생 큐
 */
export class AudioPlayer {
  private audioContext: AudioContext
  private queue: ArrayBuffer[] = []
  private isPlaying = false

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: AUDIO_CONFIG.outputSampleRate })
  }

  enqueue(audioData: ArrayBuffer) {
    this.queue.push(audioData)
    if (!this.isPlaying) {
      this.playNext()
    }
  }

  clear() {
    this.queue = []
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false
      return
    }

    this.isPlaying = true
    const audioData = this.queue.shift()!

    try {
      // AudioContext가 suspended 상태면 resume
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      // Int16 PCM -> Float32 변환
      const float32Data = int16ToFloat32(new Int16Array(audioData))
      const audioBuffer = this.audioContext.createBuffer(
        1,
        float32Data.length,
        AUDIO_CONFIG.outputSampleRate
      )
      audioBuffer.getChannelData(0).set(float32Data)

      const source = this.audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.audioContext.destination)
      source.onended = () => this.playNext()
      source.start()
    } catch (error) {
      console.error('Audio playback error:', error)
      this.playNext()
    }
  }

  close() {
    this.queue = []
    this.audioContext.close()
  }
}

// 유틸리티 함수들
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length)
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16Array
}

function int16ToFloat32(int16Array: Int16Array): Float32Array {
  const float32Array = new Float32Array(int16Array.length)
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff)
  }
  return float32Array
}
