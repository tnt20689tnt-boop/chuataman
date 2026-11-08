import { memo, Suspense, useEffect, useRef, useState } from "react";
import { HAIR_COLORS, HAIR_LABEL, OUTFIT_COLORS, OUTFIT_LABEL, PHAP_THOAI, TAM_KINH, ZONES, quoteOfDay, type Hair, type Outfit } from "./sim";
import { input, loadAvatar, saveAvatar, setUI, teleport, useUI, type Avatar, type AvatarAccessory } from "./store";
import { checkAudioFiles, disableAudio, enableAudio, getAudioSettings, playSound, ringBell, speak, stopSpeak, pauseSpeak, resumeSpeak, subscribeAudioSettings, testFootsteps, updateAudioSettings } from "./audio";
import { connectMultiplayer, disconnectMultiplayer, sendTempleChat, sendTemplePrayer, switchMultiplayerRoom, useMultiplayer, useMultiplayerConnected, useTempleChat, useTemplePrayers } from "./multiplayer";
import { getAuthClient, type User } from "./auth";

function Lotus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <g fill="currentColor">
        <path d="M32 8c6 8 8 18 0 30-8-12-6-22 0-30z" />
        <path d="M10 22c10 0 18 6 21 17-11 1-19-6-21-17z" opacity=".85" />
        <path d="M54 22c-10 0-18 6-21 17 11 1 19-6 21-17z" opacity=".85" />
        <path d="M4 38c10-3 20 0 27 4-9 6-20 5-27-4z" opacity=".7" />
        <path d="M60 38c-10-3-20 0-27 4 9 6 20 5 27-4z" opacity=".7" />
        <rect x="14" y="48" width="36" height="3" rx="1.5" opacity=".6" />
      </g>
    </svg>
  );
}

export function Hud() {
  const avatar = useUI((s) => s.avatar);
  const panel = useUI((s) => s.panel);
  const action = useUI((s) => s.action);
  const zone = useUI((s) => s.zoneLabel);
  const pose = useUI((s) => s.pose);
  const ready = useUI((s) => s.sceneReady);
  const multiplayer = useMultiplayer();
  const connected = useMultiplayerConnected();

  useEffect(() => {
    const a = loadAvatar();
    if (a) setUI({ avatar: a });
    else setUI({ panel: "avatar" });
    connectMultiplayer();
    const auth = getAuthClient();
    const authListener = auth?.auth.onAuthStateChange((event) => {
      // Token refreshes and INITIAL_SESSION do not change this page's player
      // identity. Reconnecting for them made every visitor briefly disappear.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        disconnectMultiplayer();
        connectMultiplayer();
      }
    });
    return () => {
      authListener?.data.subscription.unsubscribe();
      disconnectMultiplayer();
    };
  }, []);

  const doAction = (a: "le" | "chap" | "thien" | "kinh") => {
    if (action === a) {
      stopSpeak();
      setUI({ action: "none", pose: "stand" });
      return;
    }
    stopSpeak();
    if (a === "le") {
      setUI({ action: "le", pose: "kneel" });
      ringBell(0.35);
    } else if (a === "chap") setUI({ action: "chap", pose: "pray" });
    else if (a === "thien") {
      setUI({ action: "thien", pose: "sit" });
      ringBell(0.45);
    } else {
      const z = ZONES.find((x) => x.id === "dien")!;
      teleport(z.x + 4, z.z + 6, z.rot);
      setUI({ action: "kinh", pose: "sit" });
      speak(TAM_KINH, () => setUI({ action: "none", pose: "stand" }));
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none" data-scene-ready={ready ? "" : undefined}>
      {/* brand */}
      <header className="hud-glass pointer-events-auto absolute left-3 top-3 flex items-center gap-3 px-4 py-2.5 sm:left-5 sm:top-5">
        <Lotus className="h-9 w-9 text-primary" />
        <div>
          <div className="font-display text-lg leading-tight tracking-wide text-foreground sm:text-xl">CHÙA TÂM AN</div>
          <div className="hidden text-xs italic text-muted-foreground sm:block">An yên trong tâm – Hạnh phúc trong đời</div>
          <button className="hud-swatch mt-2" onClick={() => setUI({ panel: "auth" })}>👤 Đăng nhập / Tài khoản</button>
        </div>
      </header>

      <div className="absolute right-3 top-3 flex flex-col items-end gap-2 sm:right-5 sm:top-5">
        <div className="hud-glass pointer-events-auto flex items-center gap-2 px-3 py-1.5 text-xs text-foreground">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-muted-foreground"}`} />
          <span>Phật tử đang hiện diện: <b>{connected ? multiplayer.players.length + 1 : 0}</b>{connected ? " người" : " · đang kết nối"}</span>
        </div>
        <div className="hud-chip">🪷 Phòng: {multiplayer.roomId} · 📍 {zone}</div>
      </div>

      {/* side tools */}
      <nav className="pointer-events-auto absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-2 sm:right-5">
        <SideBtn label="Phật pháp" icon="☸" onClick={() => setUI({ panel: panel === "phap" ? null : "phap" })} />
        <SideBtn label="Cầu nguyện" icon="🪷" onClick={() => setUI({ panel: panel === "pray" ? null : "pray" })} />
        <SideBtn label="Giao lưu" icon="💬" onClick={() => setUI({ panel: panel === "chat" ? null : "chat" })} />
        <SideBtn label="Chuông" icon="🔔" onClick={() => ringBell(0.6)} />
        <SideBtn label="Âm thanh" icon="🔊" onClick={() => setUI({ panel: panel === "audio" ? null : "audio" })} />
        <SideBtn label="Tủ trang phục" icon="👘" onClick={() => setUI({ panel: "avatar" })} />
        <SideBtn label="Phòng" icon="🏯" onClick={() => setUI({ panel: panel === "rooms" ? null : "rooms" })} />
      </nav>

      {/* action bar */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-6 sm:gap-3">
        <ActBtn icon="🙏" label="Lễ Phật" active={action === "le"} onClick={() => doAction("le")} />
        <ActBtn icon="🤲" label="Chắp tay" active={action === "chap"} onClick={() => doAction("chap")} />
        <ActBtn icon="🧘" label="Ngồi thiền" active={action === "thien"} onClick={() => doAction("thien")} />
        <ActBtn icon="📿" label="Nghe kinh" active={action === "kinh"} onClick={() => doAction("kinh")} />
        <ActBtn icon="🧭" label="Tham quan" active={panel === "tour"} onClick={() => setUI({ panel: panel === "tour" ? null : "tour" })} />
      </div>

      {(zone.toUpperCase().includes("NHÀ KHÁCH") || pose === "lie") && (
        <button
          className="hud-primary pointer-events-auto absolute bottom-28 right-24 md:bottom-24 md:right-8"
          onClick={() => window.dispatchEvent(new Event("guest-bed-toggle"))}
        >
          {pose === "lie" ? "🧍 Đứng dậy" : "🛏️ Nằm nghỉ"}
        </button>
      )}

      <div className="absolute bottom-28 left-1/2 hidden -translate-x-1/2 text-xs text-muted-foreground md:block">
        <span className="hud-chip">WASD / phím mũi tên để đi · Shift chạy · kéo chuột xoay · cuộn để phóng to</span>
      </div>

      <Joystick />

      {action === "thien" && <MeditationOverlay />}
      {action === "kinh" && <SutraOverlay />}
      {panel === "tour" && <TourPanel />}
      {panel === "phap" && <PhapPanel />}
      {panel === "pray" && <PrayPanel />}
      {panel === "chat" && <ChatPanel name={avatar?.name ?? "Phật tử"} />}
      {panel === "rooms" && <RoomsPanel currentRoom={multiplayer.roomId} />}
      {panel === "audio" && <AudioPanel />}
      {panel === "avatar" && <AvatarPanel initial={avatar} />}
      {panel === "auth" && <AuthPanel />}
    </div>
  );
}

function SideBtn({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button className="hud-side" onClick={onClick} title={label} aria-label={label}>
      <span className="text-lg">{icon}</span>
      <span className="hidden text-[10px] sm:block">{label}</span>
    </button>
  );
}

function ActBtn({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className="hud-action" data-active={active} onClick={onClick}>
      <span className="text-xl sm:text-2xl">{icon}</span>
      <span className="text-[10px] font-semibold sm:text-xs">{label}</span>
    </button>
  );
}

function Panel({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose?: () => void; wide?: boolean }) {
  return (
    <section className={`hud-panel pointer-events-auto absolute left-1/2 top-1/2 max-h-[78vh] w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-5 ${wide ? "max-w-xl" : "max-w-md"}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl text-foreground">{title}</h2>
        {onClose && (
          <button className="hud-close" onClick={onClose} aria-label="Đóng">✕</button>
        )}
      </div>
      {children}
    </section>
  );
}

const ZONE_GUIDES: Record<string, string> = {
  cong: "Bắt đầu hành trình từ cổng tam quan. Dừng lại một chút, gác lại những vội vàng bên ngoài và bước vào chùa với tâm an lành.",
  san: "Khoảng sân rộng là nơi Phật tử gặp gỡ, đi dạo và hướng lòng về điều thiện. Bạn có thể đi bộ quanh sân và ngắm toàn cảnh ngôi chùa.",
  dien: "Đại điện là nơi trang nghiêm để lễ Phật, chắp tay và lắng lòng. Hãy giữ bước chân nhẹ nhàng và dành một phút tĩnh tâm.",
  thien: "Khu thiền định yên tĩnh bên tượng Phật. Chọn nút Ngồi thiền phía dưới để thực tập hơi thở trong 1, 5, 10 hoặc 20 phút.",
  phap: "Giảng đường là nơi lắng nghe lời Phật dạy và những câu chuyện thiện lành. Mở mục Phật pháp để nghe bài thuyết pháp.",
  ho: "Hồ sen và vườn hoa là góc thư thái, nơi bạn có thể ngắm cảnh và nghỉ chân giữa hành trình.",
  chuong: "Tháp chuông nhắc ta quay về với hiện tại. Bạn có thể thỉnh chuông bằng nút Chuông ở cạnh phải màn hình.",
  kinh: "Tháp kinh tượng trưng cho kho tàng lời Phật dạy. Tại đây, bạn có thể đọc và nghe Bát Nhã Tâm Kinh.",
  giaoluu: "Khu giao lưu dành cho các Phật tử gặp gỡ. Mở mục Giao lưu để gửi lời chào tới những người đang cùng online.",
  phongsinh: "Khu phóng sinh mang ý nghĩa nuôi dưỡng lòng từ bi và trân trọng sự sống. Đây là điểm dừng để quán niệm về tình thương.",
};

function TourPanel() {
  const [selected, setSelected] = useState(0);
  const zone = ZONES[selected];
  if (!zone) return null;
  const visit = () => {
    teleport(zone.x, zone.z, zone.rot);
    setUI({ panel: null, action: "none", pose: "stand" });
  };
  return (
    <Panel title="Hành trình tham quan" onClose={() => setUI({ panel: null })} wide>
      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
          Điểm {selected + 1} / {ZONES.length}
        </div>
        <h3 className="mb-2 font-display text-xl text-foreground">{zone.name}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{ZONE_GUIDES[zone.id]}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="hud-primary" onClick={visit}>📍 Đến địa điểm này</button>
          <button className="hud-swatch" onClick={() => setSelected((i) => (i + ZONES.length - 1) % ZONES.length)}>← Trước</button>
          <button className="hud-swatch" onClick={() => setSelected((i) => (i + 1) % ZONES.length)}>Tiếp theo →</button>
        </div>
      </div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chọn nhanh địa điểm</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ZONES.map((z, i) => (
          <button key={z.id} className="hud-tile" data-active={selected === i} onClick={() => setSelected(i)}>
            <span className="mr-1 text-primary">{String(i + 1).padStart(2, "0")}.</span>{z.name}
          </button>
        ))}
      </div>
    </Panel>
  );
}

const STORIES = [
  { t: "Bát cơm của người mẹ", b: "Một cụ bà mỗi sáng để dành nửa bát cơm cho người hàng xóm neo đơn. Mười năm sau, cả xóm cùng nhau nấu cơm chay mỗi rằm cho người nghèo." },
  { t: "Cây đèn bên đường", b: "Một chú tiểu thắp đèn ở con dốc tối trước chùa. Chẳng ai biết ai thắp, nhưng không còn ai vấp ngã nơi ấy nữa." },
  { t: "Lời xin lỗi", b: "Hai anh em giận nhau ba năm. Sau một buổi nghe pháp về lòng tha thứ, người em gọi điện trước. Cả hai cùng khóc." },
];

function PhapPanel() {
  const [playing, setPlaying] = useState<null | "phap">(null);
  useEffect(() => () => stopSpeak(), []);
  return (
    <Panel title="Phật pháp" onClose={() => setUI({ panel: null })} wide>
      <div className="hud-quote mb-4">
        <div className="mb-1 text-xs uppercase tracking-widest text-primary">Lời Phật dạy hôm nay</div>
        <p className="font-display text-lg italic text-foreground">“{quoteOfDay()}”</p>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2">
        <button
          className="hud-tile"
          onClick={() => {
            if (playing) {
              stopSpeak();
              setPlaying(null);
              return;
            }
            const z = ZONES.find((x) => x.id === "phap")!;
            teleport(z.x, z.z, z.rot);
            setUI({ pose: "sit", action: "none" });
            setPlaying("phap");
            speak(PHAP_THOAI, () => setPlaying(null));
          }}
        >
          {playing ? "⏹ Dừng thuyết pháp" : "🎙 Nghe thuyết pháp"}
        </button>
        <button className="hud-tile" onClick={() => ringBell(0.6)}>🔔 Thỉnh chuông</button>
        <button className="hud-tile" onClick={() => { setUI({ panel: null }); }}>
          📿 Nghe kinh: dùng nút dưới
        </button>
        <button className="hud-tile" onClick={() => setUI({ panel: "pray" })}>🪷 Gửi lời cầu an</button>
      </div>
      <h3 className="mb-2 font-display text-lg text-foreground">Góc chuyện thiện lành</h3>
      <div className="space-y-2">
        {STORIES.map((s) => (
          <details key={s.t} className="hud-tile text-left">
            <summary className="cursor-pointer font-semibold">{s.t}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{s.b}</p>
          </details>
        ))}
      </div>
    </Panel>
  );
}

const PrayPanel = memo(function PrayPanel() {
  const [text, setText] = useState("");
  const prayers = useTemplePrayers();
  const connected = useMultiplayerConnected();
  const avatar = useUI((s) => s.avatar);
  const add = () => {
    const t = text.trim();
    if (!t || !connected) return;
    if (sendTemplePrayer(avatar?.name || "Phật tử", t)) {
      setText("");
      ringBell(0.3);
    }
  };
  return (
    <Panel title="Góc cầu nguyện chung" onClose={() => setUI({ panel: null })}>
      <p className="mb-3 text-sm text-muted-foreground">
        {connected
          ? "Gửi lời cầu an để mọi Phật tử đang online cùng đọc và hồi hướng điều lành."
          : "Chùa đang kết nối máy chủ. Khi online, bạn có thể gửi lời nguyện để mọi người cùng đọc."}
      </p>
      <div className="mb-4 flex gap-2">
        <input
          className="hud-input min-w-0 flex-1"
          type="text"
          value={text}
          maxLength={200}
          autoComplete="off"
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Nguyện cho gia đình được an lành…"
          disabled={!connected}
        />
        <button className="hud-primary" onClick={add} disabled={!connected || !text.trim()}>Gửi lời nguyện</button>
      </div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>🪷 Lời nguyện từ Phật tử đang hiện diện</span>
        <span>{prayers.length} lời</span>
      </div>
      <ul className="space-y-2">
        {prayers.map((p) => (
          <li key={p.id} className="hud-tile text-left text-sm">
            <div>🪷 {p.text}</div>
            <div className="mt-1 text-xs text-muted-foreground">— {p.name}</div>
          </li>
        ))}
        {prayers.length === 0 && <li className="hud-tile text-sm text-muted-foreground">Chưa có lời nguyện nào. Hãy là người gửi lời cầu an đầu tiên.</li>}
      </ul>
    </Panel>
  );
});
function RoomsPanel({ currentRoom }: { currentRoom: string }) {
  const [roomName, setRoomName] = useState(currentRoom);
  const join = (name: string) => {
    switchMultiplayerRoom(name);
    setUI({ panel: null });
  };
  return (
    <Panel title="Phòng sinh hoạt" onClose={() => setUI({ panel: null })}>
      <p className="mb-3 text-sm text-muted-foreground">Toàn bộ ngôi chùa là một thế giới chung. Mọi Phật tử đều nhìn thấy nhau dù đang ở sân chùa, khu thiền hay hồ sen.</p>
      <div className="mb-3 grid grid-cols-1 gap-2">
        <button className="hud-tile text-left" data-active={currentRoom === "chung"} onClick={() => join("chung")}>🏯 Phòng chung</button>
        <button className="hud-tile text-left" data-active={currentRoom === "thien"} onClick={() => join("thien")}>🧘 Phòng thiền</button>
        <button className="hud-tile text-left" data-active={currentRoom === "tung-kinh"} onClick={() => join("tung-kinh")}>📿 Phòng tụng kinh</button>
      </div>
      <label className="mb-1 block text-sm font-semibold">Tạo hoặc tham gia phòng riêng</label>
      <input className="hud-input mb-3 w-full" value={roomName} maxLength={32} onChange={(e) => setRoomName(e.target.value)} placeholder="Ví dụ: gia-dinh-toan" />
      <button className="hud-primary w-full justify-center" disabled={!roomName.trim()} onClick={() => join(roomName)}>Vào phòng này</button>
      <p className="mt-3 text-xs text-muted-foreground">Mã phòng không dấu, tối đa 32 ký tự. Chia sẻ cùng một mã phòng cho người muốn gặp nhau.</p>
    </Panel>
  );
}

function ChatPanel({ name }: { name: string }) {
  const msgs = useTempleChat();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const connected = useMultiplayerConnected();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView(), [msgs]);
  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setSendError("");
    const sent = await sendTempleChat(name, t);
    setSending(false);
    if (sent) setText("");
    else setSendError("Máy chủ chưa nhận được tin nhắn. Hãy kiểm tra kết nối rồi gửi lại.");
  };
  return (
    <Panel title="Giao lưu Phật tử" onClose={() => setUI({ panel: null })}>
      <p className="hud-note mb-3">
        {connected
          ? "Tin nhắn đang được gửi trực tiếp tới những Phật tử cùng online. Nội dung không lưu sau khi rời phiên."
          : "Chưa kết nối máy chủ. Khi kết nối online hoạt động, bạn có thể trò chuyện với mọi người trong chùa."}
      </p>
      <div className="mb-3 h-56 space-y-1.5 overflow-y-auto rounded-lg bg-muted/50 p-3 text-sm">
        {msgs.length === 0 && <div className="text-muted-foreground">A Di Đà Phật! Hãy gửi lời chào đầu tiên.</div>}
        {msgs.map((m) => (
          <div key={m.id}>
            <b className="text-primary">{m.name}:</b> <span className="text-foreground">{m.text}</span>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="flex gap-2">
        <input className="hud-input flex-1" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Nhập lời chào…" disabled={!connected} />
        <button className="hud-primary" onClick={() => void send()} disabled={!connected || !text.trim() || sending}>{sending ? "Đang gửi…" : "Gửi"}</button>
      </div>
      {sendError && <p role="alert" className="mt-2 text-xs text-destructive">{sendError}</p>}
    </Panel>
  );
}


function AudioPanel() {
  const [settings, setSettings] = useState(getAudioSettings());
  const [checks, setChecks] = useState<Record<string, string> | null>(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    const unsubscribe = subscribeAudioSettings(() => setSettings(getAudioSettings()));
    return () => { unsubscribe(); };
  }, []);
  const toggle = async () => settings.enabled ? disableAudio() : void await enableAudio();
  const test = async (id: "music" | "birds" | "bell" | "mokugyo" | "footsteps" | "water") => {
    if (!settings.enabled) {
      await enableAudio();
      if (id === "music" || id === "birds" || id === "water") return;
    }
    if (id === "footsteps") testFootsteps();
    else await playSound(id);
  };
  const checkFiles = async () => {
    setChecking(true);
    const result = await checkAudioFiles();
    setChecks(result);
    setChecking(false);
  };
  const volume = (label: string, value: number, onChange: (n: number) => void) => (
    <label className="block">
      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><b>{Math.round(value * 100)}%</b></div>
      <input className="w-full accent-primary" type="range" min="0" max="1" step="0.01" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
  const labels: Record<string, string> = { music: "Nhạc thiền", birds: "Chim và gió", water: "Nước chảy", bell: "Chuông", mokugyo: "Mõ", footsteps: "Bước chân" };
  return (
    <Panel title="Âm thanh Chùa Tâm An" onClose={() => setUI({ panel: null })} wide>
      <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card p-3">
        <div><div className="font-semibold text-foreground">Âm thanh tổng</div><div className="text-xs text-muted-foreground">Chỉ phát sau khi bạn bật</div></div>
        <button className="hud-primary" onClick={() => void toggle()}>{settings.enabled ? "🔊 Đang bật" : "🔇 Đang tắt"}</button>
      </div>
      <div className="space-y-4">
        {volume("Nhạc thiền (chỉ phát tại khu thiền)", settings.music, (music) => updateAudioSettings({ music }))}
        {volume("Thiên nhiên: chim, gió, nước", settings.nature, (nature) => updateAudioSettings({ nature }))}
        {volume("Chuông, mõ, bước chân", settings.effects, (effects) => updateAudioSettings({ effects }))}
      </div>
      <div className="mt-5">
        <div className="mb-2 text-sm font-semibold">Thử âm thanh</div>
        <div className="grid grid-cols-2 gap-2">
          <button className="hud-tile" onClick={() => void test("music")}>🎵 Bật/tắt nhạc thiền</button>
          <button className="hud-tile" onClick={() => void test("birds")}>🐦 Bật/tắt chim, gió</button>
          <button className="hud-tile" onClick={() => void test("water")}>💧 Bật/tắt nước chảy</button>
          <button className="hud-tile" onClick={() => void test("bell")}>🔔 Thử chuông</button>
          <button className="hud-tile" onClick={() => void test("mokugyo")}>🥁 Thử tiếng mõ</button>
          <button className="hud-tile" onClick={() => void test("footsteps")}>👣 Thử bước chân</button>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Kiểm tra tệp âm thanh</div>
          <button className="hud-swatch" disabled={checking} onClick={() => void checkFiles()}>{checking ? "Đang kiểm tra…" : "Kiểm tra ngay"}</button>
        </div>
        {checks ? <div className="space-y-1 text-xs">{Object.entries(checks).map(([name, status]) => <div key={name} className="flex justify-between gap-2"><span>{labels[name] ?? name}</span><b className={status === "Đã tải được" ? "text-green-600" : "text-destructive"}>{status}</b></div>)}</div> : <p className="text-xs text-muted-foreground">Kiểm tra khả năng tải và giải mã từng tệp âm thanh.</p>}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Chính điện: chỉ niệm Phật, chuông và mõ; không có nhạc nền. Hồ sen: chỉ tiếng nước và chim; không có nhạc nền. Khu thiền: nhạc thiền không lời cùng chuông và mõ. Trên điện thoại, cần chạm Bật âm thanh lần đầu.</p>
    </Panel>
  );
}

function AuthPanel() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const client = getAuthClient();

  useEffect(() => {
    if (!client) return;
    void client.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = client.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    if (!client) return setMessage("Chưa cấu hình máy chủ đăng nhập. Vui lòng thử lại sau.");
    if (!email.trim() || !password) return setMessage("Vui lòng nhập email và mật khẩu.");
    setBusy(true); setMessage("");
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    setMessage(error ? "Đăng nhập chưa thành công: " + error.message : "Đăng nhập thành công. A Di Đà Phật!");
  };

  const signInWithGoogle = async () => {
    if (!client) return setMessage("Chưa cấu hình máy chủ đăng nhập. Vui lòng thử lại sau.");
    setBusy(true); setMessage("");
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) setMessage("Chưa đăng nhập Google được: " + error.message);
    } catch {
      setMessage("Không thể kết nối Google lúc này. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const resendConfirmation = async () => {
    if (!client) return setMessage("Chưa cấu hình máy chủ đăng nhập. Vui lòng thử lại sau.");
    if (!email.trim()) return setMessage("Nhập email đã đăng ký để gửi lại thư xác nhận.");
    setBusy(true); setMessage("");
    try {
      const { error } = await client.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      });
      setMessage(error
        ? "Chưa gửi lại được email: " + error.message
        : "Đã gửi yêu cầu gửi lại email xác nhận. Hãy kiểm tra hộp thư và thư rác.");
    } catch (error) {
      setMessage("Không thể gửi email lúc này. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const signUp = async () => {
    if (!client) return setMessage("Chưa cấu hình máy chủ đăng nhập. Vui lòng thử lại sau.");
    if (!displayName.trim() || !email.trim() || password.length < 6) return setMessage("Nhập tên, email và mật khẩu ít nhất 6 ký tự.");
    setBusy(true); setMessage("");
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim().slice(0, 24) },
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (error) setMessage("Chưa đăng ký được: " + error.message);
    else {
      setDisplayName("");
      setMode("login");
      setMessage(!data.session
        ? "Đã tạo tài khoản. Hãy mở email để xác nhận, sau đó đăng nhập."
        : "Đăng ký thành công. Chào mừng bạn đến Chùa Tâm An! Bạn có thể đăng nhập ngay.");
    }
  };

  const signOut = async () => {
    if (!client) return;
    setBusy(true);
    const { error } = await client.auth.signOut();
    setBusy(false);
    setMessage(error ? "Chưa đăng xuất được: " + error.message : "Bạn đã đăng xuất.");
  };

  return (
    <Panel title="Tài khoản Phật tử" onClose={() => setUI({ panel: null })}>
      {!client && <p className="hud-note mb-3">Máy chủ đăng nhập chưa được cấu hình. Chức năng tham quan chùa vẫn dùng bình thường.</p>}
      {user ? (
        <>
          <div className="hud-tile mb-3">
            <div className="text-xs text-muted-foreground">Đang đăng nhập</div>
            <div className="mt-1 font-semibold text-foreground">{String(user.user_metadata?.['display_name'] || "Phật tử")}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
          <button className="hud-primary w-full" disabled={busy} onClick={() => void signOut()}>{busy ? "Đang xử lý…" : "Đăng xuất"}</button>
        </>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-1">
            <button type="button" className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === "login" ? "bg-card text-foreground shadow" : "text-muted-foreground"}`} onClick={() => { setMode("login"); setMessage(""); }}>Đăng nhập</button>
            <button type="button" className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === "signup" ? "bg-card text-foreground shadow" : "text-muted-foreground"}`} onClick={() => { setMode("signup"); setMessage(""); }}>Đăng ký</button>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            {mode === "login"
              ? "Chào mừng bạn trở lại Chùa Tâm An. Đăng nhập để tiếp tục hành trình an yên."
              : "Tạo tài khoản miễn phí để lưu danh tính Phật tử và kết nối cùng cộng đồng."}
          </p>
          {mode === "signup" && (
            <>
              <label className="mb-1 block text-sm font-semibold">Tên hiển thị / pháp danh</label>
              <input className="hud-input mb-3 w-full" value={displayName} maxLength={24} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ví dụ: Diệu An" autoComplete="nickname" />
            </>
          )}
          <label className="mb-1 block text-sm font-semibold">Email</label>
          <input className="hud-input mb-3 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" autoComplete="email" />
          <label className="mb-1 block text-sm font-semibold">Mật khẩu</label>
          <input className="hud-input mb-4 w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          <button className="hud-primary w-full justify-center" disabled={busy || !client} onClick={() => void (mode === "login" ? signIn() : signUp())}>
            {busy ? "Đang xử lý…" : mode === "login" ? "Đăng nhập vào chùa" : "Tạo tài khoản miễn phí"}
          </button>
          <div className="my-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>HOẶC</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <button type="button" className="hud-swatch w-full justify-center" disabled={busy || !client} onClick={() => void signInWithGoogle()}>
            <span className="mr-2 font-bold">G</span> Tiếp tục với Google
          </button>
          {mode === "login" && (
            <button type="button" className="mt-3 block w-full text-center text-xs text-primary underline underline-offset-2" disabled={busy || !client} onClick={() => void resendConfirmation()}>
              Chưa nhận được email xác nhận? Gửi lại
            </button>
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
            <button type="button" className="font-semibold text-primary underline underline-offset-2" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>
              {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
            </button>
          </p>
        </>
      )}
      {message && <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p>}
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Không thu phí. Chùa không yêu cầu thông tin thanh toán. Hãy giữ mật khẩu riêng tư và không chia sẻ cho người khác.</p>
    </Panel>
  );
}

function AvatarPanel({ initial }: { initial: Avatar | null }) {
  const [a, setA] = useState<Avatar>(initial ?? { name: "", gender: "nam", outfit: "lam", hair: "ngan", hairColor: HAIR_COLORS[0], accessory: "neck_mala" });
  const gender = a.gender ?? "nam";
  const accessoryOptions: { id: AvatarAccessory; label: string }[] = [
    { id: "neck_mala", label: "📿 Tràng hạt đeo cổ" },
    { id: "wrist_mala", label: "Tràng hạt đeo tay" },
    { id: "shoulder_sash", label: "Đai vai trang trí" },
  ];
  const ok = a.name.trim().length >= 2;
  useEffect(() => {
    setUI({ avatarPreview: a });
    return () => setUI({ avatarPreview: null });
  }, [a]);
  const update = (next: Avatar) => setA(next);
  return (
    <Panel title={initial ? "Tủ trang phục & Avatar" : "Tạo Avatar của bạn"} {...(initial ? { onClose: () => setUI({ panel: null }) } : {})}>
      <label className="mb-1 block text-sm font-semibold text-foreground">Tên hiển thị / pháp danh</label>
      <input className="hud-input mb-4 w-full" value={a.name} maxLength={24} onChange={(e) => update({ ...a, name: e.target.value })} placeholder="Ví dụ: Diệu An" />
      <div className="mb-1 text-sm font-semibold text-foreground">Kiểu nhân vật</div>
      <div className="mb-3 flex gap-2">
        {(["nam", "nu"] as const).map((nextGender) => (
          <button key={nextGender} className="hud-swatch" data-active={gender === nextGender}
            onClick={() => update({ ...a, gender: nextGender })}>
            {nextGender === "nam" ? "👨 Nam" : "👩 Nữ"}
          </button>
        ))}
      </div>
      <div className="mb-4 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Xem trước trực tiếp trên nhân vật 3D; chỉ khi lưu thì trang phục mới đồng bộ cho người chơi khác.
      </div>
      <div className="mb-1 text-sm font-semibold text-foreground">Bộ trang phục</div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["lam", "trang", "nau", "tusi", "vang"] as Outfit[]).map((o) => (
          <button key={o} className="hud-swatch" data-active={a.outfit === o} onClick={() => update({ ...a, outfit: o, hair: o === "tusi" ? "troc" : a.hair })}>
            <span className="h-4 w-4 rounded-full border border-border" style={{ background: OUTFIT_COLORS[o] }} />
            {OUTFIT_LABEL[o]}
          </button>
        ))}
      </div>
      <div className="mb-1 text-sm font-semibold text-foreground">Kiểu tóc</div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["ngan", "bui", "dai"] as Hair[]).map((h) => (
          <button key={h} className="hud-swatch" data-active={a.hair === h} onClick={() => update({ ...a, hair: h })}>
            {HAIR_LABEL[h]}
          </button>
        ))}
      </div>
      <div className="mb-1 text-sm font-semibold text-foreground">Phụ kiện</div>
      <div className="mb-4 flex flex-wrap gap-2">
        {accessoryOptions.map((item) => (
          <button key={item.id} className="hud-swatch" data-active={(a.accessory ?? "neck_mala") === item.id}
            onClick={() => update({ ...a, accessory: item.id })}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="mb-1 text-sm font-semibold text-foreground">Màu tóc</div>
      <div className="mb-5 flex gap-2">
        {HAIR_COLORS.map((c) => (
          <button key={c} className="hud-swatch h-8 w-8 justify-center p-0" data-active={a.hairColor === c} onClick={() => update({ ...a, hairColor: c })} aria-label={c}>
            <span className="h-5 w-5 rounded-full" style={{ background: c }} />
          </button>
        ))}
      </div>
      <button
        className="hud-primary w-full"
        disabled={!ok}
        onClick={() => {
          saveAvatar({ ...a, gender, name: a.name.trim() });
          setUI({ panel: null });
          ringBell(0.4);
        }}
      >
        {initial ? "Lưu trang phục" : "Bước vào chùa 🙏"}
      </button>
    </Panel>
  );
}

function MeditationOverlay() {
  const [mins, setMins] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const leftRef = useRef(0);
  useEffect(() => {
    if (mins === null) return;
    leftRef.current = mins * 60;
    setLeft(leftRef.current);
    const id = window.setInterval(() => {
      if (leftRef.current <= 1) {
        leftRef.current = 0;
        setLeft(0);
        window.clearInterval(id);
        ringBell(0.6);
        setUI({ action: "none", pose: "stand" });
        return;
      }
      leftRef.current -= 1;
      setLeft(leftRef.current);
    }, 1000);
    return () => window.clearInterval(id);
  }, [mins]);
  return (
    <div className="pointer-events-auto absolute left-1/2 top-24 -translate-x-1/2 text-center">
      <div className="hud-glass px-6 py-4">
        {mins === null ? (
          <>
            <div className="mb-2 font-display text-lg text-foreground">Chọn thời gian thiền</div>
            <div className="flex gap-2">
              {[1, 5, 10, 20].map((m) => (
                <button key={m} className="hud-swatch" onClick={() => setMins(m)}>{m} phút</button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-5">
            <div className="breath-orb" />
            <div className="text-left">
              <div className="font-display text-3xl tabular-nums text-foreground">
                {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
              </div>
              <div className="text-xs text-muted-foreground">Thở vào – tâm tĩnh lặng · Thở ra – mỉm cười</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SutraOverlay() {
  const [selected, setSelected] = useState<"bannha" | "niemphat">("bannha");
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const readings = {
    bannha: {
      title: "Bát Nhã Tâm Kinh",
      text: TAM_KINH,
      note: "Đoạn kinh Bát Nhã hiện có trong thư viện Chùa Tâm An.",
    },
    niemphat: {
      title: "Niệm Phật A Di Đà",
      text: "Nam mô A Di Đà Phật. Nam mô A Di Đà Phật. Nam mô A Di Đà Phật.",
      note: "Niệm chậm rãi, giọng đọc nhỏ và trang nghiêm.",
    },
  } as const;
  const reading = readings[selected];
  const startReading = () => {
    stopSpeak();
    setPaused(false);
    setPlaying(true);
    speak(reading.text, () => { setPlaying(false); setPaused(false); });
  };
  const stopReading = () => {
    stopSpeak();
    setPlaying(false);
    setPaused(false);
  };
  return (
    <div className="pointer-events-auto absolute left-1/2 top-20 w-[92vw] max-w-xl -translate-x-1/2">
      <div className="hud-glass max-h-[68vh] overflow-y-auto px-5 py-4">
        <div className="mb-1 text-xs uppercase tracking-widest text-primary">Thư viện đọc kinh · Chùa Tâm An</div>
        <label className="mb-3 block text-sm font-semibold text-foreground">
          Chọn bài đọc
          <select
            className="hud-input mt-1 w-full"
            value={selected}
            onChange={(e) => { stopReading(); setSelected(e.target.value as "bannha" | "niemphat"); }}
          >
            <option value="bannha">Bát Nhã Tâm Kinh</option>
            <option value="niemphat">Niệm Phật A Di Đà</option>
          </select>
        </label>
        <h3 className="mb-1 font-display text-lg text-foreground">{reading.title}</h3>
        <p className="mb-3 text-xs text-muted-foreground">{reading.note}</p>
        <p className="max-h-36 overflow-y-auto whitespace-pre-line font-display text-sm italic leading-relaxed text-foreground">{reading.text}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="hud-primary" onClick={startReading}>▶ Đọc kinh</button>
          <button className="hud-swatch" disabled={!playing || paused} onClick={() => { pauseSpeak(); setPaused(true); }}>Ⅱ Tạm dừng</button>
          <button className="hud-swatch" disabled={!playing || !paused} onClick={() => { resumeSpeak(); setPaused(false); }}>▶ Tiếp tục</button>
          <button className="hud-swatch" onClick={stopReading}>⏹ Dừng đọc</button>
          <button className="hud-swatch" onClick={() => { stopReading(); setUI({ action: "none", pose: "stand" }); }}>Đóng</button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {playing ? paused ? "Đang tạm dừng." : "Đang đọc bằng giọng tiếng Việt của thiết bị." : "Chạm Đọc kinh để nghe giọng đọc. Nếu chưa nghe tiếng, hãy kiểm tra âm lượng thiết bị."}
        </p>
      </div>
    </div>
  );
}

function Joystick() {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const base = useRef<HTMLDivElement>(null);
  const move = (cx: number, cy: number) => {
    const r = base.current!.getBoundingClientRect();
    let dx = cx - (r.left + r.width / 2);
    let dy = cy - (r.top + r.height / 2);
    const max = r.width / 2;
    const l = Math.hypot(dx, dy);
    if (l > max) {
      dx = (dx / l) * max;
      dy = (dy / l) * max;
    }
    setKnob({ x: dx, y: dy });
    input.joyR = dx / max;
    input.joyF = -dy / max;
  };
  const end = () => {
    setKnob({ x: 0, y: 0 });
    input.joyR = 0;
    input.joyF = 0;
  };
  return (
    <div
      ref={base}
      className="joystick pointer-events-auto absolute bottom-28 left-5 md:hidden"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        move(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => e.buttons && move(e.clientX, e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
