import { Component } from '@theme/component';
import { DialogComponent } from '@theme/dialog';
import { CartAddEvent } from '@theme/events';

/**
 * Custom element for upsell product cards
 */
class UpsellProductCardComponent extends Component {
  requiredRefs = [];

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this.#handleAddToCartClick);
  }

  #handleAddToCartClick = (event) => {
    if (event.target.closest('.product-card__add-to-cart')) {
      this.openUpsellModal();
    }
  };

  openUpsellModal() {
    const productId = this.dataset.productId;
    if (!productId) return;

    // Find the upsell modal in the same section
    const section = this.closest('[data-section-id]');
    if (!section) return;

    const upsellModal = section.querySelector('upsell-modal-component');
    if (upsellModal) {
      upsellModal.openModal(this);
    }
  }
}

/**
 * Custom element for the upsell modal
 */
class UpsellModalComponent extends DialogComponent {
  requiredRefs = [
    'dialog',
    'closeButton',
    'mainProductImage',
    'mainProductTitle',
    'mainProductPrice',
    'upsellCarousel',
    'subtotal',
    'confirmButton'
  ];

  constructor() {
    super();
    this.selectedUpsellProducts = new Set();
    this.currentProduct = null;
    this.upsellProducts = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this.#handleClick);
  }

  #handleClick = (event) => {
    if (event.target.closest('.upsell-product-toggle')) {
      this.#toggleUpsellProduct(event);
    }
  };

  openModal(productCard) {
    this.currentProduct = this.#getProductData(productCard);
    this.upsellProducts = this.#getUpsellProducts(this.currentProduct);

    this.#populateModal();
    this.#updateSubtotal();
    this.showDialog();
  }

  close() {
    this.closeDialog();
    this.#resetModal();
  }

  confirmAddToCart() {
    if (!this.currentProduct) return;

    const productsToAdd = [
      {
        id: this.currentProduct.variantId,
        quantity: 1
      }
    ];

    // Add selected upsell products
    this.selectedUpsellProducts.forEach(productId => {
      const upsellProduct = this.upsellProducts.find(p => p.id === productId);
      if (upsellProduct) {
        productsToAdd.push({
          id: upsellProduct.variantId,
          quantity: 1
        });
      }
    });

    this.#addProductsToCart(productsToAdd);
  }

  #getProductData(productCard) {
    const productId = productCard.dataset.productId;
    const title = productCard.querySelector('.product-card__title')?.textContent?.trim() || '';
    const priceElement = productCard.querySelector('.product-card__price');
    const price = priceElement?.textContent?.trim() || '';
    const image = productCard.querySelector('.product-card__image-img')?.src || '';
    const variantId = productCard.dataset.productId; // For simplicity, using product ID as variant ID

    return {
      id: productId,
      title,
      price,
      image,
      variantId
    };
  }

  #getUpsellProducts(product) {
    // In a real implementation, this would fetch upsell products from the metafield
    // For now, we'll return an empty array - this would be populated by the backend
    // based on the product's UPSELL PRODUCTS metafield (namespace: custom)
    return [];
  }

  #populateModal() {
    if (!this.currentProduct) return;

    // Set main product info
    this.refs.mainProductImage.src = this.currentProduct.image;
    this.refs.mainProductImage.alt = this.currentProduct.title;
    this.refs.mainProductTitle.textContent = this.currentProduct.title;
    this.refs.mainProductPrice.textContent = this.currentProduct.price;

    // Populate upsell carousel
    this.#populateUpsellCarousel();
  }

  #populateUpsellCarousel() {
    const carousel = this.refs.upsellCarousel;
    carousel.innerHTML = '';

    if (this.upsellProducts.length === 0) {
      carousel.innerHTML = '<p class="upsell-modal__no-upsells">No recommended products available.</p>';
      return;
    }

    this.upsellProducts.forEach(product => {
      const upsellItem = this.#createUpsellItem(product);
      carousel.appendChild(upsellItem);
    });
  }

  #createUpsellItem(product) {
    const item = document.createElement('div');
    item.className = 'upsell-modal__upsell-item';
    item.innerHTML = `
      <div class="upsell-modal__upsell-item-image">
        <img src="${product.image}" alt="${product.title}" width="80" height="80" loading="lazy">
      </div>
      <div class="upsell-modal__upsell-item-info">
        <h5 class="upsell-modal__upsell-item-title">${product.title}</h5>
        <p class="upsell-modal__upsell-item-price">${product.price}</p>
      </div>
      <button
        class="upsell-product-toggle button button--secondary"
        data-product-id="${product.id}"
        data-selected="false"
      >
        Select
      </button>
    `;
    return item;
  }

  #toggleUpsellProduct(event) {
    const button = event.target;
    const productId = button.dataset.productId;
    const isSelected = button.dataset.selected === 'true';

    if (isSelected) {
      this.selectedUpsellProducts.delete(productId);
      button.dataset.selected = 'false';
      button.textContent = 'Select';
      button.classList.remove('button--primary');
      button.classList.add('button--secondary');
    } else {
      this.selectedUpsellProducts.add(productId);
      button.dataset.selected = 'true';
      button.textContent = 'Unselect';
      button.classList.remove('button--secondary');
      button.classList.add('button--primary');
    }

    this.#updateSubtotal();
    this.#updateConfirmButton();
  }

  #updateSubtotal() {
    let total = this.#parsePrice(this.currentProduct.price);

    this.selectedUpsellProducts.forEach(productId => {
      const upsellProduct = this.upsellProducts.find(p => p.id === productId);
      if (upsellProduct) {
        total += this.#parsePrice(upsellProduct.price);
      }
    });

    this.refs.subtotal.textContent = this.#formatPrice(total);
  }

  #updateConfirmButton() {
    const hasSelection = this.selectedUpsellProducts.size > 0;
    this.refs.confirmButton.disabled = !hasSelection;
  }

  #parsePrice(priceString) {
    // Simple price parsing - in production, you'd want more robust parsing
    const match = priceString.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
  }

  #formatPrice(price) {
    return `$${price.toFixed(2)}`;
  }

  #resetModal() {
    this.selectedUpsellProducts.clear();
    this.currentProduct = null;
    this.upsellProducts = [];
    this.refs.confirmButton.disabled = true;
  }

  async #addProductsToCart(products) {
    try {
      // Add products one by one to cart
      for (const product of products) {
        await this.#addSingleProductToCart(product);
      }

      // Close modal and show success
      this.close();
      this.#showSuccessMessage();

      // Dispatch cart add event
      this.dispatchEvent(new CartAddEvent({}, this.id, {
        source: 'upsell-modal-component',
        itemCount: products.length
      }));

    } catch (error) {
      console.error('Error adding products to cart:', error);
      this.#showErrorMessage();
    }
  }

  async #addSingleProductToCart(product) {
    const formData = new FormData();
    formData.append('id', product.id);
    formData.append('quantity', product.quantity);

    const response = await fetch(window.Theme.routes.cart_add_url, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to add product ${product.id} to cart`);
    }

    return response.json();
  }

  #showSuccessMessage() {
    // In a real implementation, you'd show a toast or notification
    console.log('Products added to cart successfully!');
  }

  #showErrorMessage() {
    // In a real implementation, you'd show an error message
    console.error('Failed to add products to cart');
  }
}

// Register custom elements
if (!customElements.get('upsell-product-card')) {
  customElements.define('upsell-product-card', UpsellProductCardComponent);
}

if (!customElements.get('upsell-modal-component')) {
  customElements.define('upsell-modal-component', UpsellModalComponent);
}
