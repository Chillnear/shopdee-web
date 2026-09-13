'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Check,
  ChevronRight,
  CircleAlert,
  Database,
  KeyRound,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

interface Source {
  id: string;
  name: string;
  provider: string;
  platform: string;
  feed_env_key: string;
  auth_env_key: string | null;
  status: 'unconfigured' | 'active' | 'paused';
  rate_limit_rpm: number;
  batch_size: number;
}

interface Job {
  id: string;
  source_id: string;
  mode: string;
  status: string;
  stats: { fetched?: number; accepted?: number; upserted?: number; rejected?: number; errors?: number };
  last_error: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

interface Candidate {
  id: string;
  title: string;
  image_url: string;
  platform: string;
  price: number;
  score: number;
  sold_count: number | null;
  commission_rate: number | null;
  review_status: string;
}

const statusText: Record<string, string> = {
  unconfigured: 'ยังไม่ตั้งค่า',
  active: 'ทำงาน',
  paused: 'พักไว้',
  queued: 'รอคิว',
  running: 'กำลังทำงาน',
  completed: 'เสร็จแล้ว',
  failed: 'ผิดพลาด',
  cancelled: 'ยกเลิก',
};

const statusColor: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  running: 'bg-blue-100 text-blue-700',
  queued: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  paused: 'bg-neutral-100 text-neutral-600',
  unconfigured: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-neutral-100 text-neutral-500',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function progress(job: Job): number {
  if (job.status === 'completed') return 100;
  const stats = job.stats || {};
  const finished = (stats.accepted || 0) + (stats.rejected || 0);
  const fetched = stats.fetched || 0;
  return fetched > 0 ? Math.min(100, Math.round((finished / fetched) * 100)) : 0;
}

export default function IngestionAdminPage() {
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState('ใส่ admin token เพื่อดูสถานะระบบ');
  const [loading, setLoading] = useState(false);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [sourceForm, setSourceForm] = useState({ id: '', name: '', platform: 'shopee', feed_env_key: '', auth_env_key: '' });

  const api = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'x-ingest-admin-token': token, ...(init.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || `HTTP ${response.status}`);
    return data;
  }, [token]);

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [sourceData, jobData, reviewData] = await Promise.all([
        api('/api/ingest/sources'),
        api('/api/ingest/jobs?limit=50'),
        api('/api/ingest/review?status=pending&limit=12'),
      ]);
      setSources(sourceData.sources || []);
      setJobs(jobData.jobs || []);
      setCandidates(reviewData.candidates || []);
      setMessage('เชื่อมต่อหลังบ้านแล้ว — ระบบจะประมวลผลทีละ batch ตาม rate limit ของ source');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดสถานะไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [api, token]);

  useEffect(() => {
    const saved = sessionStorage.getItem('shopdee_ingest_admin_token');
    if (saved) {
      setToken(saved);
      setTokenInput(saved);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    loadDashboard();
    const timer = window.setInterval(loadDashboard, 30_000);
    return () => window.clearInterval(timer);
  }, [loadDashboard, token]);

  const activeJobs = useMemo(() => jobs.filter((job) => ['queued', 'running'].includes(job.status)).length, [jobs]);
  const totalAccepted = useMemo(() => jobs.reduce((total, job) => total + (job.stats?.accepted || 0), 0), [jobs]);

  const connect = () => {
    const value = tokenInput.trim();
    if (!value) return;
    sessionStorage.setItem('shopdee_ingest_admin_token', value);
    setToken(value);
  };

  const disconnect = () => {
    sessionStorage.removeItem('shopdee_ingest_admin_token');
    setToken('');
    setTokenInput('');
    setSources([]);
    setJobs([]);
    setCandidates([]);
  };

  const changeSourceStatus = async (source: Source) => {
    const next = source.status === 'active' ? 'paused' : 'active';
    try {
      await api(`/api/ingest/sources/${source.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'เปลี่ยนสถานะ source ไม่สำเร็จ');
    }
  };

  const createSource = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api('/api/ingest/sources', {
        method: 'POST',
        body: JSON.stringify({ ...sourceForm, provider: 'official_feed', auth_env_key: sourceForm.auth_env_key || null }),
      });
      setSourceForm({ id: '', name: '', platform: 'shopee', feed_env_key: '', auth_env_key: '' });
      setShowSourceForm(false);
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'เพิ่ม source ไม่สำเร็จ');
    }
  };

  const startJob = async (source: Source) => {
    try {
      await api('/api/ingest/jobs', { method: 'POST', body: JSON.stringify({ sourceId: source.id, mode: 'incremental' }) });
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'เริ่มงานไม่สำเร็จ');
    }
  };

  const changeJobStatus = async (job: Job, status: 'queued' | 'paused' | 'cancelled') => {
    try {
      await api(`/api/ingest/jobs/${job.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'เปลี่ยนสถานะงานไม่สำเร็จ');
    }
  };

  const review = async (candidate: Candidate, status: 'approved' | 'rejected') => {
    try {
      await api(`/api/ingest/review/${candidate.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึก review ไม่สำเร็จ');
    }
  };

  return (
    <main className="min-h-screen bg-[#FFFAF8] px-4 py-8 text-neutral-900 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl bg-hero-gradient p-6 text-white shadow-lg sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-orange-100"><ShieldCheck size={17} /> Safe affiliate ingestion</div>
            <h1 className="text-3xl font-black sm:text-4xl">หลังบ้านนำเข้าสินค้า</h1>
            <p className="mt-2 max-w-2xl text-sm text-orange-50">รับข้อมูลจาก official API/feed ที่ได้รับอนุญาตเท่านั้น ตรวจลิงก์สินค้าโดยตรง เก็บสถานะทุก batch และให้คนตรวจสอบก่อนเผยแพร่</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm backdrop-blur">
            <div className="flex items-center gap-2"><Activity size={16} /> {activeJobs} งานกำลังอยู่ใน pipeline</div>
            <div className="mt-1 text-orange-100">สะสมผ่าน review: {totalAccepted.toLocaleString('th-TH')} รายการ</div>
          </div>
        </header>

        <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <KeyRound className="text-brand-600" size={20} />
            <div className="flex-1">
              <div className="text-sm font-bold">Admin access</div>
              <div className="text-xs text-neutral-500">Token จะเก็บแค่ใน session ของ browser นี้ และไม่ถูกส่งไปที่ source ภายนอก</div>
            </div>
            <input value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && connect()} type="password" placeholder="INGEST_ADMIN_TOKEN" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-500 sm:w-64" />
            <button onClick={connect} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">เชื่อมต่อ</button>
            {token && <button onClick={disconnect} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-50">ออก</button>}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500"><Database size={14} /> {message}</div>
        </section>

        {token && <>
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              ['Sources', sources.length, 'แหล่งข้อมูลที่กำหนดไว้'],
              ['Jobs', jobs.length, 'งานทั้งหมดที่บันทึกถาวร'],
              ['Review queue', candidates.length, 'รายการรอตรวจตอนนี้'],
            ].map(([label, value, hint]) => <div key={label} className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm"><div className="text-xs font-bold uppercase tracking-wider text-neutral-400">{label}</div><div className="mt-1 text-3xl font-black text-brand-600">{value}</div><div className="text-xs text-neutral-500">{hint}</div></div>)}
          </section>

          <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Sources</h2><p className="text-sm text-neutral-500">แต่ละ source ใช้ feed URL จาก environment ที่ตั้งไว้เอง</p></div><div className="flex gap-2"><button onClick={() => setShowSourceForm((current) => !current)} className="flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-sm font-bold text-white"><Plus size={16} /> เพิ่ม source</button><button onClick={loadDashboard} className="rounded-xl border border-neutral-200 p-2 text-neutral-600" aria-label="รีเฟรช"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button></div></div>
            {showSourceForm && <form onSubmit={createSource} className="mb-4 grid gap-3 rounded-2xl bg-orange-50 p-4 sm:grid-cols-5"><input required placeholder="id เช่น shopee-feed" value={sourceForm.id} onChange={(event) => setSourceForm({ ...sourceForm, id: event.target.value })} className="rounded-xl border-0 px-3 py-2 text-sm" /><input required placeholder="ชื่อ source" value={sourceForm.name} onChange={(event) => setSourceForm({ ...sourceForm, name: event.target.value })} className="rounded-xl border-0 px-3 py-2 text-sm" /><select value={sourceForm.platform} onChange={(event) => setSourceForm({ ...sourceForm, platform: event.target.value })} className="rounded-xl border-0 px-3 py-2 text-sm"><option value="shopee">Shopee</option><option value="lazada">Lazada</option><option value="tiktok">TikTok Shop</option></select><input required placeholder="FEED env key" value={sourceForm.feed_env_key} onChange={(event) => setSourceForm({ ...sourceForm, feed_env_key: event.target.value.toUpperCase() })} className="rounded-xl border-0 px-3 py-2 text-sm" /><input placeholder="AUTH env key (ถ้ามี)" value={sourceForm.auth_env_key} onChange={(event) => setSourceForm({ ...sourceForm, auth_env_key: event.target.value.toUpperCase() })} className="rounded-xl border-0 px-3 py-2 text-sm" /><button className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-bold text-white sm:col-span-5">บันทึก source</button></form>}
            <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-neutral-100 text-xs text-neutral-400"><tr><th className="px-3 py-3">Source</th><th className="px-3 py-3">แพลตฟอร์ม</th><th className="px-3 py-3">สถานะ</th><th className="px-3 py-3">Rate limit</th><th className="px-3 py-3 text-right">จัดการ</th></tr></thead><tbody>{sources.map((source) => <tr key={source.id} className="border-b border-neutral-50"><td className="px-3 py-4"><div className="font-bold">{source.name}</div><div className="text-xs text-neutral-400">{source.id} · {source.feed_env_key}</div></td><td className="px-3 py-4 capitalize">{source.platform}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusColor[source.status]}`}>{statusText[source.status]}</span></td><td className="px-3 py-4">{source.rate_limit_rpm}/นาที · {source.batch_size}/batch</td><td className="px-3 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => changeSourceStatus(source)} className="rounded-lg border border-neutral-200 p-2" title={source.status === 'active' ? 'พัก source' : 'เปิด source'}>{source.status === 'active' ? <Pause size={15} /> : <Play size={15} />}</button>{source.status === 'active' && <button onClick={() => startJob(source)} className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white">เริ่ม batch</button>}</div></td></tr>)}{sources.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-neutral-400">ยังไม่มี source — เพิ่ม official feed ที่ได้รับอนุญาตก่อน</td></tr>}</tbody></table></div>
          </section>

          <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-black">Job status</h2><p className="text-sm text-neutral-500">Cron จะหยิบงานทีละ batch ทุกครั้ง จึงไม่รันยาวจนกระทบแพลตฟอร์ม</p></div><ChevronRight className="text-neutral-300" /></div><div className="space-y-3">{jobs.map((job) => <div key={job.id} className="rounded-2xl border border-neutral-100 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-bold">{job.source_id} <span className="ml-2 text-xs font-normal text-neutral-400">{job.mode}</span></div><div className="mt-1 text-xs text-neutral-400">สร้าง {formatDate(job.created_at)} · อัปเดต {formatDate(job.updated_at)}</div></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusColor[job.status] || statusColor.paused}`}>{statusText[job.status] || job.status}</span>{job.status === 'running' || job.status === 'queued' ? <button onClick={() => changeJobStatus(job, 'paused')} className="rounded-lg border border-neutral-200 p-2" title="พักงาน"><Pause size={15} /></button> : job.status === 'paused' ? <button onClick={() => changeJobStatus(job, 'queued')} className="rounded-lg border border-neutral-200 p-2" title="ทำต่อ"><Play size={15} /></button> : null}</div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress(job)}%` }} /></div><div className="mt-1 text-[11px] text-neutral-400">ความครบถ้วนของ batch ที่ประมวลผลแล้ว (ไม่ใช่จำนวนทั้งหมดของ feed)</div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500"><span>ดึง {job.stats?.fetched || 0}</span><span>รับ {job.stats?.accepted || 0}</span><span>ข้าม {job.stats?.rejected || 0}</span><span>ผิดพลาด {job.stats?.errors || 0}</span>{job.retry_count > 0 && <span>retry {job.retry_count}/5</span>}</div>{job.last_error && <div className="mt-2 flex items-center gap-1 text-xs text-red-600"><CircleAlert size={14} /> {job.last_error}</div>}</div>)}{jobs.length === 0 && <div className="py-8 text-center text-sm text-neutral-400">ยังไม่มีงาน ingestion</div>}</div></section>

          <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="text-xl font-black">Review queue</h2><p className="text-sm text-neutral-500">ระบบจะไม่เผยแพร่ candidate จนกว่าจะกดอนุมัติ และทุกการตัดสินใจถูกบันทึก audit</p></div><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{candidates.map((candidate) => <article key={candidate.id} className="overflow-hidden rounded-2xl border border-neutral-100"><img src={candidate.image_url} alt="" className="h-40 w-full object-cover" /><div className="space-y-2 p-4"><div className="line-clamp-2 text-sm font-bold">{candidate.title}</div><div className="flex items-center justify-between text-xs text-neutral-500"><span>{candidate.platform} · ฿{candidate.price.toLocaleString('th-TH')}</span><span className="font-bold text-brand-600">score {candidate.score}</span></div><div className="text-xs text-neutral-400">ขายแล้ว {candidate.sold_count || '-'} · คอม {candidate.commission_rate ? `${candidate.commission_rate}%` : 'ไม่มีข้อมูล'}</div><div className="flex gap-2 pt-2"><button onClick={() => review(candidate, 'approved')} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white"><Check size={14} /> อนุมัติ</button><button onClick={() => review(candidate, 'rejected')} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-red-200 py-2 text-xs font-bold text-red-600"><X size={14} /> ปฏิเสธ</button></div></div></article>)}{candidates.length === 0 && <div className="col-span-full rounded-2xl bg-neutral-50 py-10 text-center text-sm text-neutral-400">ไม่มีรายการรอตรวจ</div>}</div></section>
        </>}

        {!token && <section className="rounded-3xl border border-dashed border-orange-200 bg-white p-10 text-center shadow-sm"><Loader2 className="mx-auto mb-3 text-brand-600" size={28} /><h2 className="text-xl font-black">หลังบ้านนี้ล็อกไว้</h2><p className="mt-2 text-sm text-neutral-500">API จะไม่คืนข้อมูลใดๆ จนกว่าจะตั้งค่า `INGEST_ADMIN_TOKEN` และใส่ token ที่ถูกต้อง</p></section>}
      </div>
    </main>
  );
}
