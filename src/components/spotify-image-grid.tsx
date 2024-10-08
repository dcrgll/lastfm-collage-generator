/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useRef } from 'react'

import { type SpotifyAlbum } from '@/types/spotify'

type ImageObj = {
  img: HTMLImageElement
  name: string
  artist: string
  src: string
}

export default function SpotifyImageGrid({
  albums,
  cols = 3,
  dataUrl,
  setDataUrl,
  labels
}: {
  albums: SpotifyAlbum[]
  cols?: number
  dataUrl: string | null
  setDataUrl: (dataUrl: string) => void
  labels: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const imgSize = canvas.width / cols

    // Draw a background color
    ctx.fillStyle = '#f0f0f0' // Set the background color
    ctx.fillRect(0, 0, canvas.width, canvas.height) // Draw a rectangle that fills the entire canvas

    // Function to wrap text into multiple lines if necessary
    const drawImage = async () => {
      try {
        const images = await loadImages(albums)
        ;(images as ImageObj[]).forEach((imageObj, i) => {
          const x = (i % cols) * imgSize // x position
          const y = Math.floor(i / cols) * imgSize // y position

          // Draw the image on the canvas
          ctx.drawImage(imageObj.img, x, y, imgSize, imgSize)

          if (labels) {
            // Set font and styles for text
            ctx.font = '10px Menlo, monospace'
            ctx.fillStyle = 'white'
            ctx.textAlign = 'left' // Align text to the left
            ctx.textBaseline = 'bottom' // Set text baseline to bottom

            // Define text positioning for bottom-left corner
            const textX = x + 5 // 10px padding from the left edge
            const textY = y + imgSize - 5 // 10px padding from the bottom edge

            // Define max width for text wrapping and line height
            const maxWidth = imgSize - 20 // Add some padding from image edges
            const lineHeight = 18

            // Wrap the text into multiple lines
            const { artistLine, titleLine } = wrapText(ctx, imageObj, maxWidth)

            // Set background color and draw the background rectangle for the text
            const textHeight = 2 * lineHeight // Now we always have 2 lines
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)' // Semi-transparent black background
            ctx.fillRect(x, textY - textHeight - -2, imgSize, textHeight + 20) // Background behind the text

            // Draw the text on top of the background
            ctx.fillStyle = 'white' // Reset text color to white
            ctx.fillText(artistLine, textX, textY - lineHeight)
            ctx.fillText(titleLine, textX, textY)
          }
        })

        // for some stupid reason, this first canvas is not allowing images to be created from it.
        // so we need to create a new canvas and draw the image on it,
        // and then use the toDataURL() method to get the desired output;
        const destinationCanvas = document.createElement('canvas')
        destinationCanvas.width = canvas.width
        destinationCanvas.height = canvas.height

        const destCtx = destinationCanvas.getContext('2d')
        // Create a rectangle with the desired color
        if (destCtx) {
          destCtx.fillStyle = '#FFFFFF'
          destCtx.fillRect(0, 0, canvas.width, canvas.height)

          // Draw the original canvas onto the destination canvas
          destCtx.drawImage(canvas, 0, 0)
        }

        //finally use the destinationCanvas.toDataURL() method to get the desired output;
        const url = destinationCanvas.toDataURL()

        setDataUrl(url)
      } catch {
      } finally {
        setTimeout(() => {
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
          })
        }, 200)
      }
    }

    void drawImage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albums, cols])

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        {dataUrl && (
          <img
            src={dataUrl}
            alt="lastfm-collage"
            className="rounded-xl shadow-md"
          />
        )}

        <canvas
          ref={canvasRef}
          width={900}
          height={900}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  )
}

const wrapText = (
  context: CanvasRenderingContext2D,
  album: SpotifyAlbum,
  maxWidth: number
) => {
  const artistLine = album.artist
  let titleLine = album.name

  // Truncate the title if it's too long
  while (context.measureText(titleLine).width > maxWidth) {
    titleLine = titleLine.slice(0, -1)
  }

  // Add ellipsis if the title was truncated
  if (titleLine !== album.name) {
    titleLine = titleLine.slice(0, -3) + '...'
  }

  return { artistLine, titleLine }
}

const loadImages = async (albums: SpotifyAlbum[]) => {
  return Promise.all(
    albums.map(
      (album) =>
        new Promise((resolve, reject) => {
          const img = new Image()

          img.src = album.src.replace(
            'https://i.scdn.co',
            '/api/spotify/images/'
          )

          img.onload = () =>
            resolve({ img, name: album.name, artist: album.artist })
          img.onerror = reject
        })
    )
  )
}
