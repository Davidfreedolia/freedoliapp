/**
 * TestimonialsCarousel — drag-scrollable, auto-scrolling testimonial carousel.
 *
 * Features:
 *  - 8 testimonials duplicated for seamless infinite loop
 *  - requestAnimationFrame auto-scroll (0.5 px / frame)
 *  - Mouse drag support (desktop)
 *  - Auto-scroll pauses on hover / drag
 *  - Real Unsplash portrait photos (professional headshots)
 *  - 100 % i18n via useTranslation()
 */
import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const TESTIMONIALS = [
  { nameKey: 'testimonial_1.name', roleKey: 'testimonial_1.role', textKey: 'testimonial_1.text', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face' },
  { nameKey: 'testimonial_2.name', roleKey: 'testimonial_2.role', textKey: 'testimonial_2.text', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face' },
  { nameKey: 'testimonial_3.name', roleKey: 'testimonial_3.role', textKey: 'testimonial_3.text', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face' },
  { nameKey: 'testimonial_4.name', roleKey: 'testimonial_4.role', textKey: 'testimonial_4.text', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face' },
  { nameKey: 'testimonial_5.name', roleKey: 'testimonial_5.role', textKey: 'testimonial_5.text', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face' },
  { nameKey: 'testimonial_6.name', roleKey: 'testimonial_6.role', textKey: 'testimonial_6.text', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face' },
  { nameKey: 'testimonial_7.name', roleKey: 'testimonial_7.role', textKey: 'testimonial_7.text', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face' },
  { nameKey: 'testimonial_8.name', roleKey: 'testimonial_8.role', textKey: 'testimonial_8.text', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face' },
]

export function TestimonialsCarousel() {
  const { t } = useTranslation()
  const trackRef  = useRef(null)
  const isDragging = useRef(false)
  const startX    = useRef(0)
  const scrollLeft = useRef(0)
  const paused    = useRef(false)

  /* ── mouse drag ─────────────────────────────────────────────────────────── */
  const onMouseDown = (e) => {
    isDragging.current = true
    startX.current    = e.pageX - trackRef.current.offsetLeft
    scrollLeft.current = trackRef.current.scrollLeft
    trackRef.current.style.cursor = 'grabbing'
  }

  const onMouseMove = (e) => {
    if (!isDragging.current) return
    e.preventDefault()
    const x = e.pageX - trackRef.current.offsetLeft
    trackRef.current.scrollLeft = scrollLeft.current - (x - startX.current) * 1.5
  }

  const onMouseUp = () => {
    isDragging.current = false
    if (trackRef.current) trackRef.current.style.cursor = 'grab'
  }

  /* ── auto-scroll (rAF loop) ──────────────────────────────────────────────── */
  useEffect(() => {
    const track = trackRef.current
    let animId

    const tick = () => {
      if (!paused.current && track) {
        track.scrollLeft += 0.5
        // seamless loop: reset to start when halfway through the duplicated list
        if (track.scrollLeft >= track.scrollWidth / 2) {
          track.scrollLeft = 0
        }
      }
      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [])

  /* ── duplicate list for infinite loop ──────────────────────────────────── */
  const all = [...TESTIMONIALS, ...TESTIMONIALS]

  return (
    <section className="py-5 overflow-hidden" style={{ background: '#f8faf7' }}>
      <div className="container">
        <h2 className="text-center fw-bold mb-5 display-6">{t('testimonials.title')}</h2>
      </div>

      {/* scrollbar hidden via inline style; cannot use Bootstrap utility here */}
      <div
        ref={trackRef}
        className="d-flex gap-4 px-4"
        style={{
          overflowX: 'auto',
          cursor: 'grab',
          userSelect: 'none',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: 16,
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onMouseEnter={() => { paused.current = true }}
        onMouseOut={() => { paused.current = false }}
      >
        {all.map((item, i) => (
          <div
            key={i}
            className="card border-0 shadow-sm p-4 flex-shrink-0"
            style={{ width: 310, borderRadius: 16 }}
          >
            <div style={{ color: '#f59e0b', fontSize: 18, letterSpacing: 2, marginBottom: 12 }}>
              ★★★★★
            </div>
            <p className="text-muted fst-italic mb-4" style={{ fontSize: 14 }}>
              "{t(item.textKey)}"
            </p>
            <div className="d-flex align-items-center gap-3">
              <img
                src={item.avatar}
                alt={t(item.nameKey)}
                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E5E7EB' }}
              />
              <div>
                <div className="fw-semibold" style={{ fontSize: 14 }}>{t(item.nameKey)}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>{t(item.roleKey)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
