# Feature Specification: Smart & Warm User Experience (UX)

## 1. Business Objective
Transform the Employee and Manager dashboards from "standard data tables" into personalized, engaging portals. Add profile picture uploads to humanize the interface, and add time-aware smart greetings.

## 2. Profile Picture Architecture (Backend)
- **Database Update:** Add a `profilePicture` field (Type: String, default: "") to `models/User.js`.
- **File Storage:** Utilize `multer` to handle image uploads safely. Save images to a new directory: `uploads/avatars/`. Ensure a file size limit (e.g., 2MB) and accept only images (JPEG/PNG/WebP).
- **API Endpoint:** Create `POST /api/users/upload-avatar` (Protected route). It receives the image, saves it, updates the current user's document, and returns the new image URL.
- **Static Serving:** Ensure `server.js` exposes the `uploads/avatars` folder statically so the frontend can display the images.

## 3. The "Avatar" Component (Frontend UI)
Create a reusable `<UserAvatar />` React component.
- **Smart Fallback:** If the user has a `profilePicture`, display the image as a circle with `object-fit: cover`. If they DO NOT have a picture, display a colored circle containing their initials (e.g., "MZ").
- **Click-to-Update:** Hovering over the avatar shows a camera icon overlay. Clicking it opens a hidden file input to upload a new picture seamlessly via the new API. Update the global user state/local storage so the UI updates instantly without refreshing.

## 4. "Smart & Warm" Dashboard Overhaul
Create a `WelcomeHero` component and place it at the top of `EmployeeDashboard.js` and `ManagerDashboard.js`.
- **Dynamic Greeting:** Implement time-based logic based on the user's local clock. 
  *(05:00-11:59 = "Good morning 🌅", 12:00-16:59 = "Good afternoon ☕", 17:00+ = "Good evening 🌙").*
- **The "Welcome Banner":** A beautiful, rounded top card containing the Avatar and the Greeting (`[Avatar] Good morning, [First Name]!`).
- **Smart Quick Stats:** Display visual cards next to the greeting for what employees care about most: 
  1. Annual Leave Remaining (🌴)
  2. Excuses Remaining (⏳)
  3. Today's Shift Times (⏱️)
- **Styling:** Use modern UI techniques (soft drop-shadows, rounded corners `borderRadius: 16px`, and a welcoming gradient or clean white background).