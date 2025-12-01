import { useEffect } from 'react'
import './App.css'
import { useSlidesCore } from './hooks/useSlidesCore'
import { useWebcamCore } from './hooks/useWebcamCore'
import { useMicCore } from './hooks/useMicCore'
import { useVoskCore } from './hooks/useVoskCore'
import { useRecorderCore } from './hooks/useRecorderCore'

function App() {
  const slides = useSlidesCore()
  const cam = useWebcamCore()
  const mic = useMicCore()
  const vosk = useVoskCore()
  const rec = useRecorderCore()

  useEffect(() => {
    (async () => {
      console.log('Core demo ready. Load a PDF using the input below to test SlidesCore.')
      vosk.loadVoskModel().catch(() => console.log('Vosk model not loaded yet'))
    })()
  }, [])

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const pages = await slides.loadPDF(f)
      console.log('PDF loaded; pages:', pages)
      const page = await slides.getPage(1)
      console.log('Got page 1 viewport:', page.getViewport({ scale: 1 }).width)
    } catch (err) {
      console.error('SlidesCore error', err)
    }
  }

  const startCam = async () => {
    try {
      const s = await cam.startWebcam()
      console.log('Webcam started?', !!s)
    } catch (err) {
      console.error('WebcamCore error', err)
    }
  }
  const stopCam = () => cam.stopWebcam()

  const startMic = async () => {
    try {
      await mic.startMic((chunk) => console.log('Mic chunk len:', chunk.length))
    } catch (err) {
      console.error('MicCore error', err)
    }
  }
  const stopMic = () => mic.stopMic()

  const startRec = async () => {
    try {
      rec.onRecordingReady((blob) => console.log('Recording ready size:', blob.size))
      await rec.startRecording()
      console.log('Recording started')
    } catch (err) {
      console.error('RecorderCore error', err)
    }
  }
  const stopRec = () => rec.stopRecording()

  return (
    <div style={{ padding: 24 }}>
      <h1>SlideStage Core Demo (No UI)</h1>
      <p>Use these controls to smoke-test core modules. Check console for logs.</p>
      <div style={{ display: 'grid', gap: 8 }}>
        <input type="file" accept="application/pdf" onChange={onFile} />
        <div>
          <button onClick={startCam}>Start Webcam</button>
          <button onClick={stopCam}>Stop Webcam</button>
        </div>
        <div>
          <button onClick={startMic}>Start Mic</button>
          <button onClick={stopMic}>Stop Mic</button>
        </div>
        <div>
          <button onClick={startRec}>Start Recording (tab)</button>
          <button onClick={stopRec}>Stop Recording</button>
        </div>
      </div>
    </div>
  )
}

export default App
