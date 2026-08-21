# FEUGO Apparel — v2

Modernized, Gen-Z streetwear storefront. Everyone can browse and check out
with no account. Firebase is used **only** for the staff Admin panel
(login + product/order data) — there's no Firebase Storage; product photos
live in a local folder.

## What changed from v1

- **Public shop, no login required.** Browsing, adding to bag, and checkout
  all work for anonymous visitors. The bag persists in the browser
  (`localStorage`), and checkout collects a name + WhatsApp number instead
  of requiring an account.
- **Local images folder.** Product photos live in `images/products/`
  instead of Firebase Storage. Admin picks a photo from a dropdown built
  from the `PRODUCT_IMAGES` list at the top of `app.js`.
- **Firebase = staff admin only.** Firebase Auth gates the `/admin` view;
  Firestore stores the product catalog and the order log. No public sign-up
  flow exists anymore.
- Redesigned front end (new `index.html` / `style.css`) with a Gen-Z
  streetwear "drop" look: tape-corner price tags, halftone texture, spray/
  stamp accents pulled from your existing FEUGO logo and sticker artwork.

## Files

```
index.html
style.css
app.js
images/products/          ← product photos, referenced by filename
  doberman-white.jpg
  zebra-drop-black.jpg
  zebra-drop-white.jpg
  never-average-orange.jpg
  never-average-mint.jpg
  feugo25-black.jpg
  puffs-kisses-black.jpg
  puffs-kisses-white.jpg
```

I cropped 8 starter product photos out of your existing promo graphics so
the shop has real inventory to show immediately. Swap them for proper
studio shots whenever you have them — same filenames, or add new ones (see
below).

## Adding / changing product photos

1. Drop the image file into `images/products/`.
2. Open `app.js` and add the filename to the `PRODUCT_IMAGES` array near
   the top of the file.
3. In the Admin panel, the new photo now appears in the "Product image"
   dropdown when adding or editing a product.

No image upload, resizing, or Firebase Storage involved — it's just static
files shipped with the site.

## Setting up the staff Admin account

1. In the [Firebase console](https://console.firebase.google.com/), open
   your `fuego-6ccb1` project → **Authentication** → **Users** → **Add
   user**.
2. Create exactly one user with the email `admin@feugo.com` (or change the
   `ADMIN_EMAIL` constant at the top of `app.js` to whatever email you
   prefer, then create that user instead).
3. That's the only account that will ever see the Admin nav item or be
   allowed to write products/read orders — everyone else who tries the
   "Staff Login" link in the footer gets signed out automatically with a
   "staff only" message.

## Firestore security rules

Since the shop is public now, your Firestore rules need to allow anyone to
**read** products, but only the admin account to **write** them. Guests
also need to **create** orders (but not read/edit others' orders). In the
Firebase console → **Firestore Database** → **Rules**, use:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null
                    && request.auth.token.email == 'admin@feugo.com';
    }
    match /orders/{orderId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null
                    && request.auth.token.email == 'admin@feugo.com';
    }
  }
}
```

If you changed `ADMIN_EMAIL` in `app.js`, use the same email here.

## Running it

This is a static site — no build step. Open `index.html` directly, or
serve the folder with any static server (e.g. `npx serve .`) and push it
to GitHub Pages, Netlify, Firebase Hosting, etc.

## Notes

- If Firestore has no products yet (or the site is offline), the shop
  falls back to a sample catalog built from the 8 starter images so the
  page is never empty. Add real products in Admin and they take over
  automatically.
- WhatsApp number and banking details are hardcoded near the top of
  `app.js` / inside the Bag section of `index.html` — update both when
  your details change.
