from pathlib import Path
path = Path('src/pages/Dashboard.js')
text = path.read_text(encoding='utf-8')
marker = '{order.discountAmount > 0 && (\n              <div className="text-success small">???: {currency(order.discountAmount)}</div>\n            )}\n'
block = """            {order.storeDiscountAmount > 0 && (
              <div className=\"text-success small\">خصم المتجر: {currency(order.storeDiscountAmount)}</div>
            )}
            {order.shippingFee > 0 && (
              <div className=\"small\">رسوم الشحن: {currency(order.shippingFee)}</div>
            )}
"""
text = text.replace(marker, block + marker, 1)
path.write_text(text, encoding='utf-8')
