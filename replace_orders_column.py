from pathlib import Path
text = Path('src/pages/Orders.js').read_text(encoding='utf-8')
marker = '<div className="col-md-6">'
first = text.index(marker)
start = text.index(marker, first + 1)
idx = start
count = 0
end = None
while idx < len(text):
    if text.startswith('<div', idx):
        count += 1
        idx += 4
        continue
    if text.startswith('</div>', idx):
        count -= 1
        idx += len('</div>')
        if count == 0:
            end = idx
            break
        continue
    idx += 1
if end is None:
    raise SystemExit('unable to find end of column block')
new_block = """<div className=\"col-md-6\">
            <h6>مراجعة المبلغ</h6>
            <div className=\"mb-1 d-flex justify-content-between\">
              <span>قيمة المنتجات</span>
              <strong>{currency(goodsTotal)}</strong>
            </div>
            {storeDiscountAmount > 0 && (
              <div className=\"mb-1 d-flex justify-content-between text-success\">
                <span>خصم المتجر</span>
                <strong>- {currency(storeDiscountAmount)}</strong>
              </div>
            )}
            {couponDiscountAmount > 0 && (
              <div className=\"mb-1 d-flex justify-content-between text-success\">
                <span>خصم الكوبون</span>
                <strong>- {currency(couponDiscountAmount)}</strong>
              </div>
            )}
            {shippingFee > 0 && (
              <div className=\"mb-1 d-flex justify-content-between\">
                <span>رسوم الشحن</span>
                <strong>{currency(shippingFee)}</strong>
              </div>
            )}
            <div className=\"mb-2 d-flex justify-content-between border-top pt-2\">
              <span>الإجمالي النهائي</span>
              <strong>{currency(order.totalPrice)}</strong>
            </div>
            {order.coupon?.code && (
              <div className=\"mb-2\"><small className=\"badge bg-info text-dark\">كوبون: {order.coupon.code}</small></div>
            )}
            <div className=\"mb-2\">الحالة: <strong>{statusLabel(order.status)}</strong></div>
            <div className=\"mb-2\">طريقة الدفع: <strong>{order.payment?.method || order.paymentMethod || '-'}</strong></div>
            {order.payment?.transactionId && <div className=\"mb-2\">رقم العملية: <strong>{order.payment.transactionId}</strong></div>}
            <div className=\"mt-2\">
              <label className=\"form-label\">تغيير الحالة</label>
              <select className=\"form-select\" value={order.status} onChange={(e) => onChangeStatus(order._id, e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </div>
          </div>"""
text = text[:start] + new_block + text[end:]
Path('src/pages/Orders.js').write_text(text, encoding='utf-8')
