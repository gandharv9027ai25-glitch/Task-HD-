const path = require("path");

// ==========================================
// LOAD ENVIRONMENT VARIABLES
// ==========================================
require("dotenv").config({
  path: path.join(__dirname, ".env")
});

// ==========================================
// IMPORT PACKAGES
// ==========================================
const express = require("express");
const cors = require("cors");
const formData = require("form-data");
const Mailgun = require("mailgun.js");

const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const {
  getFirestore,
  FieldValue
} = require("firebase-admin/firestore");

// ==========================================
// FIREBASE ADMIN SETUP
// ==========================================
const serviceAccount = require("./firebase-service-account.json");

initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth();
const db = getFirestore();

// ==========================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ==========================================
async function verifyAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    const idToken = authHeader.substring("Bearer ".length);
    const decodedToken = await auth.verifyIdToken(idToken);

    const userDoc = await db
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (!userDoc.exists || userDoc.data().role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    req.adminUser = decodedToken;
    next();

  } catch (error) {
    console.error("Admin authentication error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token."
    });
  }
}

// ==========================================
// EXPRESS SETUP
// ==========================================
const app = express();
const PORT = 3000;

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174"
  ]
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ==========================================
// MAILGUN CONFIGURATION
// ==========================================
console.log("API key loaded:", !!process.env.MAILGUN_API_KEY);
console.log("Domain loaded:", !!process.env.MAILGUN_DOMAIN);

const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY
});

// ==========================================
// HEALTH CHECK
// ==========================================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running"
  });
});

// ==========================================
// NEWSLETTER SUBSCRIPTION
// ==========================================
app.post("/api/subscribe", async (req, res) => {
  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim()
      : "";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address."
    });
  }

  if (
    !process.env.MAILGUN_API_KEY ||
    !process.env.MAILGUN_DOMAIN
  ) {
    console.error("Mailgun configuration is missing.");

    return res.status(500).json({
      success: false,
      message: "Email service is not configured."
    });
  }

  try {
    const response = await mg.messages.create(
      process.env.MAILGUN_DOMAIN,
      {
        from: `DEV@Deakin <postmaster@${process.env.MAILGUN_DOMAIN}>`,
        to: [email],
        subject: "Welcome to DEV@Deakin!",
        text: "Welcome to DEV@Deakin! Thank you for subscribing.",
        html: `
          <h1>Welcome to DEV@Deakin!</h1>
          <p>Thank you for subscribing to our DEV@Deakin platform.</p>
          <p>We are happy to have you with us!</p>
        `
      }
    );

    console.log("Mailgun accepted the email request:", response.id);

    return res.status(200).json({
      success: true,
      message: "Subscription successful! Welcome email requested."
    });

  } catch (error) {
    console.error("Mailgun error:", error.message || "Unknown error");

    return res.status(502).json({
      success: false,
      message: "Unable to send the welcome email. Please try again."
    });
  }
});

// ==========================================
// UPGRADE SUBSCRIPTION
// ==========================================
app.post("/api/upgrade-plan", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Please log in first."
      });
    }

    const idToken = authHeader.substring("Bearer ".length);
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const { name, cardNumber, expiry, cvv } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof cardNumber !== "string" ||
      typeof expiry !== "string" ||
      typeof cvv !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all demonstration fields."
      });
    }

    const digits = cardNumber.replace(/\s/g, "");

    if (!/^\d{12,19}$/.test(digits)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid demonstration card number."
      });
    }

    const expiryMatch = expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);

    if (!expiryMatch || !/^\d{3,4}$/.test(cvv)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid expiry date and demonstration CVV."
      });
    }

    const month = Number(expiryMatch[1]);
    const year = 2000 + Number(expiryMatch[2]);
    const now = new Date();

    if (
      year < now.getFullYear() ||
      (year === now.getFullYear() && month < now.getMonth() + 1)
    ) {
      return res.status(400).json({
        success: false,
        message: "The expiry date must be in the future."
      });
    }

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User profile was not found."
      });
    }

    if (userDoc.data().plan === "Paid") {
      return res.status(409).json({
        success: false,
        message: "You are already on the Paid plan."
      });
    }

    await userRef.update({
      plan: "Paid"
    });

    return res.status(200).json({
      success: true,
      message: "Your demonstration upgrade was successful.",
      plan: "Paid"
    });

  } catch (error) {
    console.error(
      "Upgrade error:",
      error.code || error.message || "Unknown error"
    );

    if (
      error.code === "auth/argument-error" ||
      error.code === "auth/invalid-id-token" ||
      error.code === "auth/id-token-expired"
    ) {
      return res.status(401).json({
        success: false,
        message: "Your login session is invalid or expired. Please log in again."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to complete the upgrade. Please try again."
    });
  }
});

// ==========================================
// CREATE A NEW POST
// ==========================================
app.post("/api/posts", async (req, res) => {
  try {
    // Check authentication
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Please log in before submitting a post."
      });
    }

    // Verify Firebase token
    const idToken = authHeader.substring("Bearer ".length);
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Get the user's actual subscription plan from Firestore
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User profile was not found."
      });
    }

    const userPlan =
      userDoc.data().plan === "Paid" ? "Paid" : "Free";

    // Get submitted post information
    const {
      postType,
      postPlan,
      title,
      description,
      abstract,
      articleText,
      tags
    } = req.body;

    // Validate post type
    if (!["Question", "Article"].includes(postType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post type."
      });
    }

    // Validate requested visibility
    if (!["Free", "Paid"].includes(postPlan)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid post plan."
      });
    }

    // Free users cannot create Paid posts
    if (postPlan === "Paid" && userPlan !== "Paid") {
      return res.status(403).json({
        success: false,
        message: "A Paid subscription is required to create Paid posts."
      });
    }

    // Validate title
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: "Title is required and must be 150 characters or fewer."
      });
    }

    // Validate question description
    if (postType === "Question") {
      if (
        typeof description !== "string" ||
        !description.trim() ||
        description.trim().length > 10000
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid question description."
        });
      }
    }

    // Validate article content
    if (postType === "Article") {
      if (
        typeof abstract !== "string" ||
        !abstract.trim() ||
        abstract.trim().length > 2000 ||
        typeof articleText !== "string" ||
        !articleText.trim() ||
        articleText.trim().length > 20000
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid abstract and article text."
        });
      }
    }

    // Validate tags
    if (!Array.isArray(tags) || tags.length > 3) {
      return res.status(400).json({
        success: false,
        message: "You can add a maximum of 3 tags."
      });
    }

    const cleanTags = tags.map(tag =>
      typeof tag === "string" ? tag.trim() : ""
    );

    if (
      cleanTags.some(tag =>
        !tag ||
        tag.length > 30 ||
        !/^[a-zA-Z0-9+#.-]+$/.test(tag)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid tags."
      });
    }

    // Prepare post data
    const postData = {
      userId,
      postType,
      postPlan,
      title: title.trim(),
      tags: cleanTags,
      createdAt: FieldValue.serverTimestamp()
    };

    if (postType === "Question") {
      postData.description = description.trim();
    } else {
      postData.abstract = abstract.trim();
      postData.articleText = articleText.trim();
    }

    // Save post to Firestore
    const postRef = await db.collection("posts").add(postData);

    return res.status(201).json({
      success: true,
      message: "Post submitted successfully!",
      postId: postRef.id
    });

  } catch (error) {
    console.error(
      "Create post error:",
      error.code || error.message || "Unknown error"
    );

    if (
      error.code === "auth/argument-error" ||
      error.code === "auth/invalid-id-token" ||
      error.code === "auth/id-token-expired"
    ) {
      return res.status(401).json({
        success: false,
        message: "Your login session is invalid or expired. Please log in again."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to submit your post. Please try again."
    });
  }
});

// ==========================================
// BROWSE POSTS WITH SEARCH, FILTERING
// AND PAGINATION
// ==========================================
app.get("/api/posts", async (req, res) => {
  try {
    // Identify the user's subscription plan from their Firebase token.
    let userPlan = "Free";
    const authHeader = req.headers.authorization || "";

    if (authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.substring("Bearer ".length);
      const decodedToken = await auth.verifyIdToken(idToken);

      const userDoc = await db
        .collection("users")
        .doc(decodedToken.uid)
        .get();

      if (userDoc.exists && userDoc.data().plan === "Paid") {
        userPlan = "Paid";
      }
    }

    // Validate pagination parameters.
    const requestedLimit = Number.parseInt(req.query.limit, 10);

    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 20)
      : 5;

    const cursor =
      typeof req.query.cursor === "string"
        ? req.query.cursor.trim()
        : "";

    // Read search and filter parameters.
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim().toLowerCase()
        : "";

    const typeFilter =
      typeof req.query.type === "string"
        ? req.query.type.trim()
        : "";

    const planFilter =
      typeof req.query.plan === "string"
        ? req.query.plan.trim()
        : "";

    const tagFilter =
      typeof req.query.tag === "string"
        ? req.query.tag.trim().toLowerCase()
        : "";

    const fromDate =
      typeof req.query.fromDate === "string" && req.query.fromDate
        ? new Date(req.query.fromDate)
        : null;

    const toDate =
      typeof req.query.toDate === "string" && req.query.toDate
        ? new Date(req.query.toDate)
        : null;

    // Validate filter values.
    if (typeFilter && !["Question", "Article"].includes(typeFilter)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post type filter."
      });
    }

    if (planFilter && !["Free", "Paid"].includes(planFilter)) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan filter."
      });
    }

    // Enforce subscription access on the server.
    if (userPlan === "Free" && planFilter === "Paid") {
      return res.status(403).json({
        success: false,
        message: "A Paid subscription is required to view Paid posts."
      });
    }

    if (
      (fromDate && Number.isNaN(fromDate.getTime())) ||
      (toDate && Number.isNaN(toDate.getTime()))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date filter."
      });
    }

    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "The start date cannot be after the end date."
      });
    }

    // Fetch only posts the current subscription is allowed to access.
    let postsQuery = db.collection("posts");

    if (userPlan === "Free") {
      postsQuery = postsQuery.where("postPlan", "==", "Free");
    }

    postsQuery = postsQuery.orderBy("createdAt", "desc");

    const snapshot = await postsQuery.get();

    // Apply search and filters on the backend before pagination.
    let filteredPosts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    filteredPosts = filteredPosts.filter(post => {
      const searchableText = [
        post.title,
        post.description,
        post.abstract,
        post.articleText,
        ...(Array.isArray(post.tags) ? post.tags : [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (search && !searchableText.includes(search)) {
        return false;
      }

      if (typeFilter && post.postType !== typeFilter) {
        return false;
      }

      if (planFilter && post.postPlan !== planFilter) {
        return false;
      }

      if (
        tagFilter &&
        !(
          Array.isArray(post.tags) &&
          post.tags.some(tag => String(tag).toLowerCase() === tagFilter)
        )
      ) {
        return false;
      }

      if (fromDate || toDate) {
        const postDate = post.createdAt?.toDate
          ? post.createdAt.toDate()
          : null;

        if (!postDate) {
          return false;
        }

        if (fromDate && postDate < fromDate) {
          return false;
        }

        if (toDate) {
          const endOfDay = new Date(toDate);
          endOfDay.setHours(23, 59, 59, 999);

          if (postDate > endOfDay) {
            return false;
          }
        }
      }

      return true;
    });

    // Find the cursor within the filtered result set.
    let startIndex = 0;

    if (cursor) {
      const cursorIndex = filteredPosts.findIndex(
        post => post.id === cursor
      );

      if (cursorIndex === -1) {
        return res.status(400).json({
          success: false,
          message: "Invalid pagination cursor. Please reload the posts."
        });
      }

      startIndex = cursorIndex + 1;
    }

    // Return one page of results.
    const pagePosts = filteredPosts.slice(
      startIndex,
      startIndex + limit
    );

    const hasMore = startIndex + limit < filteredPosts.length;

    const nextCursor =
      hasMore && pagePosts.length > 0
        ? pagePosts[pagePosts.length - 1].id
        : null;

    return res.status(200).json({
      success: true,
      userPlan,
      posts: pagePosts,
      nextCursor,
      hasMore,
      totalFilteredPosts: filteredPosts.length
    });

  } catch (error) {
    console.error("BROWSE POSTS ERROR:", error);

    if (
      error.code === "auth/argument-error" ||
      error.code === "auth/invalid-id-token" ||
      error.code === "auth/id-token-expired"
    ) {
      return res.status(401).json({
        success: false,
        message: "Your login session is invalid or expired."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to load posts. Please try again."
    });
  }
});

// ==========================================
// ADMIN DASHBOARD STATISTICS
// ==========================================
app.get("/api/admin/stats", verifyAdmin, async (req, res) => {
  try {
    const [
      usersSnapshot,
      postsSnapshot,
      freeUsersSnapshot,
      paidUsersSnapshot
    ] = await Promise.all([
      db.collection("users").count().get(),

      db.collection("posts").count().get(),

      db.collection("users")
        .where("plan", "==", "Free")
        .count()
        .get(),

      db.collection("users")
        .where("plan", "==", "Paid")
        .count()
        .get()
    ]);

    const statistics = {
      totalUsers: usersSnapshot.data().count,
      totalPosts: postsSnapshot.data().count,
      freeUsers: freeUsersSnapshot.data().count,
      paidUsers: paidUsersSnapshot.data().count
    };

    return res.status(200).json({
      success: true,
      message: "Admin statistics retrieved successfully.",
      statistics
    });

  } catch (error) {
    console.error("Admin statistics error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve dashboard statistics."
    });
  }
});

// ==========================================
// ADMIN VIEW ALL USERS
// ==========================================
app.get("/api/admin/users", verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db
      .collection("users")
      .get();

    const users = snapshot.docs.map(doc => {
      const userData = doc.data();

      return {
        id: doc.id,
        name: userData.name || "Unknown",
        email: userData.email || "",
        plan: userData.plan || "Free",
        role: userData.role || "user"
      };
    });

    return res.status(200).json({
      success: true,
      totalUsers: users.length,
      users
    });

  } catch (error) {
    console.error("Admin fetch users error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve users."
    });
  }
});

// ==========================================
// ADMIN UPDATE USER SUBSCRIPTION PLAN
// ==========================================
app.put("/api/admin/users/:userId/plan", verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { plan } = req.body;

    // Validate user ID
    if (!userId || userId.includes("/")) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID."
      });
    }

    // Only allow Free or Paid plans
    if (!["Free", "Paid"].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: "Plan must be Free or Paid."
      });
    }

    // Prevent administrators from changing their own plan
    if (req.adminUser.uid === userId) {
      return res.status(403).json({
        success: false,
        message: "You cannot change your own subscription plan."
      });
    }

    // Find the user
    const userRef = db.collection("users").doc(userId);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    // Update subscription plan
    await userRef.update({
      plan: plan
    });

    console.log(
      `Admin ${req.adminUser.uid} changed user ${userId} plan to ${plan}`
    );

    return res.status(200).json({
      success: true,
      message: `User subscription updated to ${plan}.`,
      userId,
      plan
    });

  } catch (error) {
    console.error("Admin update user plan error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update user subscription."
    });
  }
});

// ==========================================
// ADMIN VIEW ALL POSTS
// ==========================================
app.get("/api/admin/posts", verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db
      .collection("posts")
      .orderBy("createdAt", "desc")
      .get();

    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json({
      success: true,
      totalPosts: posts.length,
      posts
    });

  } catch (error) {
    console.error("Admin fetch posts error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve posts."
    });
  }
});

// ==========================================
// ADMIN DELETE POST
// ==========================================
app.delete("/api/admin/posts/:postId", verifyAdmin, async (req, res) => {
  try {
    const { postId } = req.params;

    // Validate post ID
    if (
      typeof postId !== "string" ||
      !postId.trim() ||
      postId.includes("/")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID."
      });
    }

    // Find the post in Firestore
    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    // Check whether the post exists
    if (!postDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Post not found."
      });
    }

    // Delete the post
    await postRef.delete();

    console.log(
      `Admin ${req.adminUser.uid} deleted post ${postId}`
    );

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully."
    });

  } catch (error) {
    console.error("Admin delete post error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete the post."
    });
  }
});

// ==========================================
// START BACKEND SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});