const canvas = document.getElementById('stars')
const context = canvas.getContext('2d')
const dialog = document.getElementById('discord-dialog')
const openButton = document.getElementById('discord-button')
const closeButton = dialog.querySelector('.dialog-backdrop')
const copyButton = document.getElementById('copy-discord')
const musicButton = document.getElementById('music-toggle')
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

let width = innerWidth
let height = innerHeight
let ratio = Math.min(devicePixelRatio || 1, 2)
let stars = []
let shootingStars = []
let lastTime = 0
let nextShootingStar = 4000 + Math.random() * 7000
let closeTimer

const audio = new Audio()
let tracks = []
let currentTrack = -1
let musicReady = false
let musicPlaying = false

audio.volume = .28

audio.addEventListener('ended', playNextTrack)
audio.addEventListener('play', () => setMusicState(true))
audio.addEventListener('pause', () => setMusicState(false))

function makeStar() {
  const depth = Math.random()

  return {
    x: Math.random() * width,
    y: Math.random() * height,
    radius: .25 + depth * .95,
    alpha: .07 + depth * .43,
    phase: Math.random() * Math.PI * 2,
    pulse: .00016 + Math.random() * .00032,
    driftX: (Math.random() - .5) * (.004 + depth * .012),
    driftY: .003 + depth * .014
  }
}

function makeShootingStar() {
  const x = width * (.25 + Math.random() * .6)
  const y = -30 - Math.random() * 120
  const speed = .35 + Math.random() * .25

  return {
    x,
    y,
    vx: -speed,
    vy: speed * .72,
    life: 0,
    maxLife: 900 + Math.random() * 500,
    length: 70 + Math.random() * 70
  }
}

function resize() {
  width = innerWidth
  height = innerHeight
  ratio = Math.min(devicePixelRatio || 1, 2)
  canvas.width = width * ratio
  canvas.height = height * ratio
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  stars = Array.from({ length: Math.max(90, Math.floor(width * height / 9000)) }, makeStar)
}

function drawStars(time, delta) {
  for (const star of stars) {
    if (!reducedMotion) {
      star.x += star.driftX * delta
      star.y += star.driftY * delta

      if (star.x < -3) star.x = width + 3
      if (star.x > width + 3) star.x = -3
      if (star.y > height + 3) {
        star.y = -3
        star.x = Math.random() * width
      }
    }

    const glow = reducedMotion ? 1 : .74 + Math.sin(time * star.pulse + star.phase) * .26
    context.beginPath()
    context.fillStyle = `rgba(255,255,255,${star.alpha * glow})`
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
    context.fill()
  }
}

function drawShootingStars(delta) {
  for (let i = shootingStars.length - 1; i >= 0; i -= 1) {
    const star = shootingStars[i]
    star.life += delta
    star.x += star.vx * delta
    star.y += star.vy * delta

    const progress = star.life / star.maxLife
    const alpha = Math.sin(Math.min(progress, 1) * Math.PI) * .42
    const magnitude = Math.hypot(star.vx, star.vy)
    const ux = star.vx / magnitude
    const uy = star.vy / magnitude

    const gradient = context.createLinearGradient(
      star.x,
      star.y,
      star.x - ux * star.length,
      star.y - uy * star.length
    )

    gradient.addColorStop(0, `rgba(255,255,255,${alpha})`)
    gradient.addColorStop(1, 'rgba(255,255,255,0)')

    context.beginPath()
    context.strokeStyle = gradient
    context.lineWidth = 1
    context.moveTo(star.x, star.y)
    context.lineTo(star.x - ux * star.length, star.y - uy * star.length)
    context.stroke()

    if (star.life >= star.maxLife) shootingStars.splice(i, 1)
  }
}

function draw(time = 0) {
  const delta = Math.min(time - lastTime || 16, 32)
  lastTime = time
  context.clearRect(0, 0, width, height)

  drawStars(time, delta)

  if (!reducedMotion) {
    if (time >= nextShootingStar) {
      shootingStars.push(makeShootingStar())
      nextShootingStar = time + 8000 + Math.random() * 9000
    }

    drawShootingStars(delta)
  }

  requestAnimationFrame(draw)
}

function openDialog() {
  clearTimeout(closeTimer)
  dialog.hidden = false
  dialog.classList.remove('is-closing')
  dialog.classList.add('is-opening')
  copyButton.focus()
  setTimeout(() => dialog.classList.remove('is-opening'), 500)
}

function closeDialog() {
  if (dialog.hidden || dialog.classList.contains('is-closing')) return

  dialog.classList.remove('is-opening')
  dialog.classList.add('is-closing')

  closeTimer = setTimeout(() => {
    dialog.hidden = true
    dialog.classList.remove('is-closing')
    openButton.focus()
  }, reducedMotion ? 0 : 240)
}

function setMusicState(playing) {
  musicPlaying = playing
  musicButton.setAttribute('aria-pressed', String(playing))
  musicButton.setAttribute('aria-label', playing ? 'Pause music' : 'Play music')
}

function chooseTrack() {
  if (tracks.length < 2) return 0

  let next = currentTrack

  while (next === currentTrack) {
    next = Math.floor(Math.random() * tracks.length)
  }

  return next
}

function playNextTrack() {
  if (!tracks.length) return

  currentTrack = chooseTrack()
  audio.src = `music/${tracks[currentTrack]}`
  audio.play().catch(() => setMusicState(false))
}

async function loadMusic() {
  try {
    const response = await fetch('music/songs.json')
    const data = await response.json()
    tracks = data.filter(track => typeof track === 'string' && track.trim())
    musicReady = tracks.length > 0
  } catch {
    musicReady = false
  }
}

async function toggleMusic() {
  if (!musicReady) await loadMusic()

  if (!tracks.length) {
    musicButton.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(3px)' },
        { transform: 'translateX(0)' }
      ],
      { duration: 240 }
    )
    return
  }

  if (musicPlaying) {
    audio.pause()
  } else if (audio.src) {
    audio.play().catch(() => setMusicState(false))
  } else {
    playNextTrack()
  }
}

openButton.addEventListener('click', openDialog)
closeButton.addEventListener('click', closeDialog)
musicButton.addEventListener('click', toggleMusic)

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('disciplist')
    copyButton.textContent = 'Copied'
  } catch {
    copyButton.textContent = '@disciplist'
  }

  setTimeout(() => {
    copyButton.textContent = 'Copy username'
  }, 1400)
})

addEventListener('keydown', event => {
  if (event.key === 'Escape' && !dialog.hidden) closeDialog()
})

addEventListener('resize', resize)
resize()
loadMusic()
requestAnimationFrame(draw)
