import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

const emptyModel = () => ({ Name:'', Sell:0, Category:'', Subcategory:'', Material:'', Season:'', Style:'', QTY:0, imageUrl:'', Description:'' });

const Products = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [model, setModel] = useState(emptyModel());
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const normalizeResponseList = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.products) return res.products;
    if (res.data && Array.isArray(res.data)) return res.data;
    return [];
  };

  const load = async (p = page) => {
    setLoading(true);
    const res = await api.get(`/products?page=${p}&limit=${limit}`);
    if (res.ok) {
      const items = normalizeResponseList(res.data);
      setList(items);
      // attempt to read total from server response if present
      const t = res.data?.total ?? res.data?.count ?? items.length;
      setTotal(t);
    } else {
      setList([]);
      setTotal(0);
    }
    setLoading(false);
  };

  useEffect(()=>{ load(1); }, []);

  const toast = useToast();

  const save = async () => {
    // basic validation
    if (!model.Name) return (toast('Name is required', { type: 'error' }), null);
    const payload = { ...model, Sell: Number(model.Sell), QTY: Number(model.QTY) };
    if (editing) {
      const res = await api.put(`/products/${editing}`, payload);
      if (res.ok) { setEditing(null); setModel(emptyModel()); load(page); }
      else toast(res.error || 'Failed to save', { type: 'error' });
      return;
    }
    const res = await api.post('/products', payload);
    if (res.ok) { setModel(emptyModel()); load(1); setPage(1); }
    else toast(res.error || 'Failed to create', { type: 'error' });
  };

  const edit = (p) => { setEditing(p._id); setModel({ Name:p.Name||'', Sell:p.Sell||0, Category:p.Category||'', Subcategory:p.Subcategory||'', Material:p.Material||'', Season:p.Season||'', Style:p.Style||'', QTY:p.QTY||0, imageUrl:p.imageUrl||'', Description:p.Description||'' }); };
  const remove = async (id) => { if (!window.confirm('Delete product?')) return; const res = await api.del(`/products/${id}`); if (res.ok) { load(page); toast('Product deleted', { type: 'success' }); } else toast(res.error || 'Delete failed', { type: 'error' }); };

  const prevPage = () => { if (page <= 1) return; const np = page - 1; setPage(np); load(np); };
  const nextPage = () => { const maxPages = Math.ceil((total || list.length) / limit); if (page >= maxPages) return; const np = page + 1; setPage(np); load(np); };

  return (
    <div className="container-admin">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">Products</h3>
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={()=>load(page)}>Refresh</button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-5">
          <div className="card p-3">
            <h5 className="mb-3">{editing ? 'Edit Product' : 'Create Product'}</h5>
            <div className="mb-2"><label className="form-label">Name</label><input className="form-control" value={model.Name} onChange={e=>setModel(m=>({...m, Name:e.target.value}))} /></div>
            <div className="mb-2"><label className="form-label">Price (Sell)</label><input className="form-control" type="number" value={model.Sell} onChange={e=>setModel(m=>({...m, Sell: e.target.value}))} /></div>
            <div className="mb-2"><label className="form-label">Category</label><input className="form-control" value={model.Category} onChange={e=>setModel(m=>({...m, Category:e.target.value}))} /></div>
            <div className="mb-2"><label className="form-label">Subcategory</label><input className="form-control" value={model.Subcategory} onChange={e=>setModel(m=>({...m, Subcategory:e.target.value}))} /></div>
            <div className="mb-2"><label className="form-label">Material</label><input className="form-control" value={model.Material} onChange={e=>setModel(m=>({...m, Material:e.target.value}))} /></div>
            <div className="mb-2"><label className="form-label">Season</label><input className="form-control" value={model.Season} onChange={e=>setModel(m=>({...m, Season:e.target.value}))} /></div>
            <div className="mb-2"><label className="form-label">Style</label><input className="form-control" value={model.Style} onChange={e=>setModel(m=>({...m, Style:e.target.value}))} /></div>
            <div className="mb-2"><label className="form-label">Quantity (QTY)</label><input className="form-control" type="number" value={model.QTY} onChange={e=>setModel(m=>({...m, QTY: e.target.value}))} /></div>
            <div className="mb-2"><label className="form-label">Image URL</label><input className="form-control" value={model.imageUrl} onChange={e=>setModel(m=>({...m, imageUrl:e.target.value}))} /></div>
            {model.imageUrl && <div className="mb-2"><img src={model.imageUrl} alt="preview" style={{maxWidth:'100%', maxHeight:160, objectFit:'contain', border:'1px solid #eee'}} /></div>}
            <div className="mb-2"><label className="form-label">Description</label><textarea className="form-control" rows={3} value={model.Description} onChange={e=>setModel(m=>({...m, Description:e.target.value}))} /></div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary" onClick={save}>{editing ? 'Save Changes' : 'Create Product'}</button>
              {editing && <button className="btn btn-secondary" onClick={()=>{ setEditing(null); setModel(emptyModel()); }}>Cancel</button>}
            </div>
          </div>
        </div>

        <div className="col-md-7">
          <div className="card p-3">
            <h5 className="mb-3">Existing Products</h5>
            {loading && <div>Loading…</div>}
            {!loading && list.length === 0 && <div className="text-muted">No products found</div>}
            {!loading && list.map(p=> (
              <div key={p._id} className="mb-2 p-2" style={{border:'1px solid #eee', borderRadius:6}}>
                <div className="d-flex">
                  <div style={{width:96, height:96, background:'#fafafa', display:'flex', alignItems:'center', justifyContent:'center', marginRight:12, border:'1px solid #f0f0f0'}}>
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.Name} style={{maxWidth:'100%', maxHeight:'100%', objectFit:'contain'}} /> : <div style={{fontSize:11, color:'#999'}}>No image</div>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700}}>{p.Name} <span className="text-muted" style={{fontWeight:400}}>— ج.م {p.Sell}</span></div>
                    <div style={{fontSize:13, color:'#666'}}>{p.Category}{p.Subcategory ? ` › ${p.Subcategory}` : ''} {p.Material ? ` • ${p.Material}` : ''}</div>
                    <div style={{marginTop:6, fontSize:13}}>{p.Description}</div>
                    <div className="mt-2 d-flex gap-2">
                      <button className="btn btn-sm btn-outline-secondary" onClick={()=>edit(p)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={()=>remove(p._id)}>Delete</button>
                    </div>
                  </div>
                  <div style={{width:110, textAlign:'right'}}>
                    <div className="text-muted">QTY</div>
                    <div style={{fontWeight:700}}>{p.QTY ?? 0}</div>
                  </div>
                </div>
              </div>
            ))}

            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted">Page {page} — {total || list.length} items</div>
              <div>
                <button className="btn btn-sm btn-outline-secondary me-2" onClick={prevPage} disabled={page<=1}>Prev</button>
                <button className="btn btn-sm btn-outline-secondary" onClick={nextPage} disabled={(total && page >= Math.ceil(total/limit)) || list.length < limit}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
