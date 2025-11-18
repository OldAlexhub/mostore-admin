import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

const DEFAULT_FORM = {
  header: '',
  sentence1: '',
  sentence2: '',
  sentence3: '',
  contactLabel: '',
  whatsappNumber: ''
};

const HeroContent = () => {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    const res = await api.get('/hero');
    if (res.ok) {
      setForm({
        header: res.data?.header || DEFAULT_FORM.header,
        sentence1: res.data?.sentence1 || DEFAULT_FORM.sentence1,
        sentence2: res.data?.sentence2 || DEFAULT_FORM.sentence2,
        sentence3: res.data?.sentence3 || DEFAULT_FORM.sentence3,
        contactLabel: res.data?.contactLabel || DEFAULT_FORM.contactLabel,
        whatsappNumber: res.data?.whatsappNumber || DEFAULT_FORM.whatsappNumber
      });
    } else {
      toast(res.error || 'تعذر تحميل بيانات البانر', { type: 'error' });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    setSaving(true);
    const res = await api.put('/hero', form);
    setSaving(false);
    if (res.ok) {
      setForm({
        header: res.data?.header || '',
        sentence1: res.data?.sentence1 || '',
        sentence2: res.data?.sentence2 || '',
        sentence3: res.data?.sentence3 || '',
        contactLabel: res.data?.contactLabel || '',
        whatsappNumber: res.data?.whatsappNumber || ''
      });
      toast('تم حفظ محتوى البانر', { type: 'success' });
    } else {
      toast(res.error || 'تعذر حفظ المحتوى', { type: 'error' });
    }
  };

  return (
    <div className="container-admin" dir="rtl">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h3 className="mb-0">محتوى البانر الرئيسي</h3>
          <small className="text-muted">تحكم في العناوين والجمل المعروضة على الصفحة الرئيسية.</small>
        </div>
        <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>{loading ? 'يتم التحديث...' : 'إعادة تحميل'}</button>
      </div>

      <div className="card p-3">
        <div className="mb-3">
          <label className="form-label">العنوان الرئيسي</label>
          <input className="form-control" value={form.header} onChange={e => updateField('header', e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">الجملة الأولى</label>
          <textarea className="form-control" rows={2} value={form.sentence1} onChange={e => updateField('sentence1', e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">الجملة الثانية</label>
          <textarea className="form-control" rows={2} value={form.sentence2} onChange={e => updateField('sentence2', e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">الجملة الثالثة</label>
          <textarea className="form-control" rows={2} value={form.sentence3} onChange={e => updateField('sentence3', e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">نص قسم التواصل</label>
          <input className="form-control" value={form.contactLabel} onChange={e => updateField('contactLabel', e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">رقم واتساب (صيغة دولية)</label>
          <input className="form-control" value={form.whatsappNumber} onChange={e => updateField('whatsappNumber', e.target.value)} placeholder="+20100..." />
          <small className="text-muted">تأكد من كتابة الرقم مع مفتاح الدولة مثل +20100...</small>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ المحتوى'}</button>
        </div>
      </div>
    </div>
  );
};

export default HeroContent;
