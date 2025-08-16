// @ts-nocheck
import { DialogComponent } from '@theme/dialog';
import { CartUpdateEvent } from '@theme/events';

class UpsellModalComponent extends DialogComponent {
  constructor() {
    super();
    this.selected = new Set();
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', async (e) => {
      if (e.target.closest('.upsell-product-toggle')) {
        this.toggleProduct(e.target);
      }
      if (e.target.closest('.upsell-product-options')) {
        await this.seeMoreOptions(e.target);
      }
      if (e.target.closest('.upsell-modal__confirm')) {
        await this.addToCart();
      }
      if (e.target.closest('.upsell-modal__close')) {
        this.closeDialog();
      }
    });
  }

  toggleProduct(btn) {
    const id = btn.dataset.productId;

    if (this.selected.has(id)) {
      this.selected.delete(id);
      btn.textContent = 'Select';
      btn.className = 'upsell-product-toggle button';
    } else {
      this.selected.add(id);
      btn.textContent = 'Unselect';
      btn.className = 'upsell-product-toggle button';
    }

    this.updateSubtotal();
  }

  updateSubtotal() {
    let total = this.main.price;

    this.selected.forEach(id => {
      const product = this.products.find(product => product.id.toString() === id);
      if (product) total += product.price;
    });

    this.refs.subtotal.textContent = `$${total.toFixed(2)}`;
  }

  async addToCart() {
    const confirmButton = this.refs.confirmButton || this.querySelector('.upsell-modal__confirm');
    const originalText = confirmButton.textContent;

    confirmButton.textContent = 'Adding to cart...';
    confirmButton.disabled = true;
    confirmButton.style.opacity = '0.7';

    try {
      const items = [{ id: this.main.variantId, quantity: 1 }];

      this.selected.forEach(id => {
        const product = this.products.find(product => product.id.toString() === id);
        if (product) items.push({ id: product.variantId, quantity: 1 });
      });

      for (const item of items) {
        await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      }

      this.closeDialog();
      this.updateCartCount();
    } finally {
      confirmButton.textContent = originalText;
      confirmButton.disabled = false;
      confirmButton.style.opacity = '1';
    }
  }

  async seeMoreOptions(btn) {
    await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.main.variantId, quantity: 1 })
    });

    this.updateCartCount();
    this.closeDialog();
    window.location.href = btn.dataset.productUrl;
  }

  async updateCartCount() {
    const cartData = await fetch('/cart.js').then(response => response.json());

    document.dispatchEvent(new CartUpdateEvent({}, 'upsell-modal', {
      itemCount: cartData.item_count,
      source: 'upsell-modal'
    }));
  }

  openModal(card) {
    const script = card.querySelector('script[data-upsell-products-json]');
    const data = JSON.parse(script.innerHTML);
    this.main = data.mainProduct;
    this.products = data.upsellProducts;

    this.selected.clear();

    this.refs.upsellCarousel.innerHTML = this.products.map(product => {
      const hasMultipleVariants = product.variantCount > 1;
      const buttonClass = hasMultipleVariants ? 'upsell-product-options button' : 'upsell-product-toggle button';
      const buttonText = hasMultipleVariants ? 'See more options' : 'Select';

      return `<div class="upsell-modal__upsell-item">
        <img src="${product.image}" alt="${product.title}" width="80" height="80">
        ${product.sku ? `<span class="upsell-product-sku">${product.sku}</span>` : ''}
        <h5>${product.title}</h5>
        <p>$${product.price.toFixed(2)}</p>
        <button class="${buttonClass}" data-product-id="${product.id}" data-product-url="${product.url}">${buttonText}</button>
      </div>`;
    }).join('');

    this.refs.subtotal.textContent = `$${this.main.price.toFixed(2)}`;
    this.showDialog();
  }
}

customElements.define('upsell-modal-component', UpsellModalComponent);

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.button[type="submit"], add-to-cart-component button')) {
        if (card.querySelector('script[data-upsell-products-json]')) {
          e.preventDefault();
          document.querySelector('upsell-modal-component')?.openModal(card);
        }
      }
    });
  });
});
