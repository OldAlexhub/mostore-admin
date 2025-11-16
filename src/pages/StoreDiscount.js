import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

const defaultConfig = {
  active: false,
  type: 'general',
  value: 0,
  minTotal: 0,
  shipping: { enabled: false, amount: 0 }
};

const StoreDiscount = () => {
  const [config, setConfig] = useState(defaultConfig);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = async () => {
    const res = await api.get('/store/discount');
    if (res.ok) {
      setConfig(res.data || defaultConfig);
    } else {
      setConfig(defaultConfig);
    }
  };

  useEffect(() => { load(); }, []);

  const updateField = (field, value) => setConfig((prev) => ({ ...prev, [field]: value }));
  const updateShipping = (field, value) => setConfig((prev) => ({
    ...prev,
    shipping: {
      ...(prev.shipping || defaultConfig.shipping),
      [field]: value
    }
  }));

  const save = async () => {
    setSaving(true);
    const res = await api.put('/store/discount', config);
    setSaving(false);
    if (res.ok) {
      toast('تم حفظ الإعدادات', { type: 'success' });
      setConfig(res.data || defaultConfig);
    } else {
      toast(res.error || 'فشل الحفظ', { type: 'error' });
    }
  };

  return (
    <div dir="rtl" className="container-admin">
      <h3>إعدادات الخصومات والشحن</h3>
      <div className="text-muted mb-3">حدد قواعد الخصم العام ورسوم الشحن الثابتة ليظهروا في متجر العملاء.</div>

      <div className="card p-3">
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="discount-active"
            checked={config.active}
            onChange={e => updateField('active', e.target.checked)}
          />
          <label className="form-check-label" htmlFor="discount-active">تفعيل الخصم العام</label>
        </div>

        <div className="mb-3">
          <label className="form-label">نوع الخصم</label>
          <div className="d-flex gap-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="discount-type"
                id="type-general"
                checked={config.type === 'general'}
                onChange={() => updateField('type', 'general')}
                disabled={!config.active}
              />
              <label className="form-check-label" htmlFor="type-general">يطبق على كل الطلبات</label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="discount-type"
                id="type-threshold"
                checked={config.type === 'threshold'}
                onChange={() => updateField('type', 'threshold')}
                disabled={!config.active}
              />
              <label className="form-check-label" htmlFor="type-threshold">يطبق بعد حد أدنى</label>
            </div>
          </div>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-sm-4">
            <label className="form-label">قيمة الخصم (%)</label>
            <input
              type="number"
              className="form-control"
              value={config.value}
              onChange={e => updateField('value', Number(e.target.value))}
              min={0}
              max={100}
              disabled={!config.active}
            />
          </div>
          <div className="col-sm-4">
            <label className="form-label">حد الإنفاق قبل الخصم (ج.م)</label>
            <input
              type="number"
              className="form-control"
              value={config.minTotal}
              onChange={e => updateField('minTotal', Number(e.target.value))}
              min={0}
              disabled={!config.active || config.type !== 'threshold'}
            />
          </div>
        </div>

        <hr />

        <div className="mb-3">
          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="shipping-enabled"
              checked={!!config.shipping?.enabled}
              onChange={e => updateShipping('enabled', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="shipping-enabled">تفعيل رسوم شحن ثابتة</label>
          </div>
          <label className="form-label">قيمة الشحن (ج.م)</label>
          <input
            type="number"
            className="form-control"
            value={config.shipping?.amount ?? 0}
            onChange={e => updateShipping('amount', Number(e.target.value))}
            min={0}
            disabled={!config.shipping?.enabled}
          />
          <div className="form-text text-muted">تظهر رسوم الشحن في صفحة السلة وتتضاف للفواتير والمتابعة.</div>
        </div>

        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'يتم الحفظ...' : 'حفظ'}
        </button>
      </div>
    </div>
  );
};

export default StoreDiscount;
