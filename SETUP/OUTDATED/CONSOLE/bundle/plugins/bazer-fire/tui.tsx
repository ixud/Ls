import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { createSignal, onCleanup } from "solid-js"

// Ember Nova — เปลวไฟที่มีประกายลอยออกจากท้ายคำ และ "หายใจ" สีจากถ่านแดง → ทองเรืองแสง
// แต่ละเฟรมมีเวลาของตัวเอง (d) ให้จังหวะกระพริบดูเป็นธรรมชาติ ไม่เท่ากันเป๊ะ
// c = สีของทั้งบรรทัด (hex) · t = ข้อความ · d = อยู่เฟรมนี้นานกี่ ms
const FRAMES = [
  { c: "#a34a15", t: "🔥 BAZER",      d: 150 }, // ถ่านแดง
  { c: "#c65a1b", t: "🔥 BAZER ·",    d: 120 }, // เริ่มมีประกาย
  { c: "#e86a1f", t: "🔥 BAZER ✦",    d: 110 },
  { c: "#ff7a28", t: "🔥 BAZER ✦·",   d: 100 },
  { c: "#ff9440", t: "🔥 BAZER ✧✦",   d: 95  }, // ประกายลอยขึ้น
  { c: "#ffb257", t: "🔥 BAZER ✧✦·",  d: 95  },
  { c: "#ffd166", t: "🔥 BAZER ✧✦",   d: 110 },
  { c: "#ffe68a", t: "🔥 BAZER ✦·",   d: 130 },
  { c: "#fff3c4", t: "✦🔥 BAZER✦",   d: 170 }, // ยอดเปลว — เรืองแสงสุด (nova burst)
  { c: "#ffe68a", t: "🔥 BAZER ·",    d: 130 },
  { c: "#ffc078", t: "🔥 BAZER",      d: 120 },
  { c: "#e86a1f", t: "🔥 BAZER",      d: 150 },
]

function BazerFire(props: { sessionID?: string }) {
  const context = usePlugin()
  const [i, setI] = createSignal(0)
  const [show, setShow] = createSignal(false)

  // วนเฟรมแบบ setTimeout ต่อกัน (ความเร็วต่างกันรายเฟรม) แทน setInterval ความเร็วคงที่
  let timer: any = null
  const tick = () => {
    setI((v) => (v + 1) % FRAMES.length)
    timer = setTimeout(tick, FRAMES[i()].d)
  }
  timer = setTimeout(tick, FRAMES[0].d)

  const poll = setInterval(() => {
    try {
      const sid = props.sessionID
      if (!sid) { setShow(false); return }
      const s: any = (context.data as any).session.get(sid)
      const agent = String(s?.agent ?? s?.info?.agent ?? "").toLowerCase()
      setShow(agent === "bazer")
    } catch { setShow(false) }
  }, 600)

  onCleanup(() => { clearTimeout(timer); clearInterval(poll) })

  const cur = () => FRAMES[i()] || FRAMES[0]
  return <text fg={cur().c}>{(show() ? " " + cur().t : "") as any}</text>
}

export default Plugin.define({
  id: "bazer.fire",
  setup(context) {
    let un: any = null
    const mount = (place: any) =>
      context.ui.slot({
        append: place,
        render: (p: any) => <BazerFire sessionID={p?.sessionID} />,
      })
    try { un = mount("prompt.footer.status") } catch {
      try { un = mount("session.composer.top") } catch { un = null }
    }
    return () => { try { un && un() } catch {} }
  },
})
