document.addEventListener("DOMContentLoaded", function () {
  const drawer = document.querySelector("[data-cart-drawer]");
  const overlay = document.querySelector("[data-cart-drawer-overlay]");

  if (!drawer || !overlay) {
    return;
  }

  /* ========================================
     OPEN DRAWER
  ======================================== */

  function openCartDrawer() {
    drawer.classList.add("is-active");
    overlay.classList.add("is-active");

    drawer.setAttribute("aria-hidden", "false");

    document.body.classList.add("cart-drawer-open");
  }

  /* ========================================
     CLOSE DRAWER
  ======================================== */

  function closeCartDrawer() {
    drawer.classList.remove("is-active");
    overlay.classList.remove("is-active");

    drawer.setAttribute("aria-hidden", "true");

    document.body.classList.remove("cart-drawer-open");
  }

  /* ========================================
     UPDATE CART COUNT
  ======================================== */

  function updateCartCount(itemCount) {
    document.querySelectorAll("[data-cart-count]").forEach(function (counter) {
      counter.textContent = itemCount;

      counter.hidden = itemCount === 0;
    });
  }

  /* ========================================
     REFRESH DRAWER
  ======================================== */

  async function refreshDrawer() {
    const drawerResponse = await fetch(
      window.ShopifyRoutes.cart + "?section_id=cart-drawer",
    );

    if (!drawerResponse.ok) {
      throw new Error("Unable to refresh cart drawer.");
    }

    const html = await drawerResponse.text();

    const parser = new DOMParser();

    const newDocument = parser.parseFromString(html, "text/html");

    const newDrawer = newDocument.querySelector("[data-cart-drawer]");

    if (newDrawer) {
      drawer.innerHTML = newDrawer.innerHTML;
    }

    /* Get latest cart */

    const cartResponse = await fetch(window.ShopifyRoutes.cart + ".js");

    if (!cartResponse.ok) {
      throw new Error("Unable to fetch cart.");
    }

    const cart = await cartResponse.json();

    updateCartCount(cart.item_count);

    return cart;
  }

  /* ========================================
     NAVBAR CART
  ======================================== */

  document.addEventListener("click", function (event) {
    const cartLink = event.target.closest("[data-cart-drawer-open]");

    if (!cartLink) {
      return;
    }

    event.preventDefault();

    openCartDrawer();
  });

  /* ========================================
     CLOSE BUTTON
  ======================================== */

  document.addEventListener("click", function (event) {
    const closeButton = event.target.closest("[data-cart-drawer-close]");

    if (!closeButton) {
      return;
    }

    closeCartDrawer();
  });

  /* ========================================
     OVERLAY
  ======================================== */

  overlay.addEventListener("click", function () {
    closeCartDrawer();
  });

  /* ========================================
     ESC KEY
  ======================================== */

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeCartDrawer();
    }
  });

  /* ========================================
     ADD TO CART
  ======================================== */

  document.addEventListener("submit", async function (event) {
    const form = event.target;

    if (!form.matches('form[action*="/cart/add"]')) {
      return;
    }

    const idInput = form.querySelector('[name="id"]');

    if (!idInput) {
      return;
    }

    event.preventDefault();

    const button = form.querySelector('[type="submit"]');

    const originalText = button ? button.textContent : "Add to Cart";

    if (button) {
      button.disabled = true;
      button.textContent = "Adding...";
    }

    try {
      const formData = new FormData(form);

      const response = await fetch(window.ShopifyRoutes.cartAdd + ".js", {
        method: "POST",

        headers: {
          Accept: "application/json",
        },

        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();

        throw new Error(error.description || "Unable to add product.");
      }

      await response.json();

      /* Refresh drawer */

      await refreshDrawer();

      /* Open drawer */

      openCartDrawer();
    } catch (error) {
      console.error("Cart Drawer:", error);

      alert(error.message || "Unable to add product.");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  });

  /* ========================================
     QUANTITY / REMOVE
  ======================================== */

  drawer.addEventListener("click", async function (event) {
    const plus = event.target.closest("[data-cart-drawer-plus]");

    const minus = event.target.closest("[data-cart-drawer-minus]");

    const remove = event.target.closest("[data-cart-drawer-remove]");

    if (!plus && !minus && !remove) {
      return;
    }

    const lineElement = plus || minus || remove;

    const line = parseInt(lineElement.dataset.line, 10);

    if (!line) {
      return;
    }

    try {
      /* Get current cart */

      const cartResponse = await fetch(window.ShopifyRoutes.cart + ".js");

      if (!cartResponse.ok) {
        throw new Error("Unable to fetch cart.");
      }

      const cart = await cartResponse.json();

      const item = cart.items[line - 1];

      if (!item) {
        return;
      }

      let quantity = item.quantity;

      /* Plus */

      if (plus) {
        quantity++;
      }

      /* Minus */

      if (minus) {
        quantity--;
      }

      /* Remove */

      if (remove) {
        quantity = 0;
      }

      /* Update Shopify cart */

      const updateResponse = await fetch(
        window.ShopifyRoutes.cartChange + ".js",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            Accept: "application/json",
          },

          body: JSON.stringify({
            line: line,
            quantity: quantity,
          }),
        },
      );

      if (!updateResponse.ok) {
        throw new Error("Unable to update cart.");
      }

      /* Refresh drawer */

      await refreshDrawer();
    } catch (error) {
      console.error("Cart update error:", error);
    }
  });
});
