document.addEventListener("DOMContentLoaded", () => {
  const API = 'http://localhost:3000/api';

  // --- LOGIN ---
  const loginForm = document.querySelector("#loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector("button[type='submit']");
      const username = loginForm.querySelector("#username").value.trim();
      const password = loginForm.querySelector("#password").value.trim();
      if (!username || !password) return alert("Harap isi username dan password");
      btn.disabled = true;
      btn.innerHTML = 'Memproses...';
      try {
        const res = await fetch(`${API}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem("kosUser", JSON.stringify(data.user));
          if (data.user.role === "admin") {
            window.location.href = "index.html";
          } else {
            window.location.href = "user-dashboard.html";
          }
        } else {
          alert(data.error || "Gagal login.");
        }
      } catch (err) {
        console.error(err);
        alert("Kesalahan koneksi ke server.");
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Login';
      }
    });
  }

  // --- AUTH GUARD ---
  const adminPages = ["index.html", "kamar.html", "laporan.html", "pembayaran.html", "penghuni.html", "notifikasi.html", "pengaduan.html", "user.html"];
  const userPages = ["user-dashboard.html", "user-pembayaran.html", "user-pengaduan.html", "user-notifikasi.html"];
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  if (adminPages.includes(currentPage) || userPages.includes(currentPage)) {
    const user = JSON.parse(localStorage.getItem("kosUser"));
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // Admin trying to access user pages or vice versa
    if (adminPages.includes(currentPage) && user.role !== 'admin') {
      window.location.href = "user-dashboard.html";
      return;
    }
    if (userPages.includes(currentPage) && user.role === 'admin') {
      window.location.href = "index.html";
      return;
    }

    // Update navbar with user info
    const navbarUser = document.querySelector('.navbar-user');
    if (navbarUser) {
      const nameSpan = navbarUser.querySelector('span');
      if (nameSpan) {
        nameSpan.textContent = user.nama;
        nameSpan.style.color = '#fff';
        nameSpan.style.fontWeight = 'bold';
        nameSpan.style.marginRight = '10px';
      }
    }
  }

  // --- LOGOUT ---
  const logoutLinks = document.querySelectorAll("a.btn-danger");
  logoutLinks.forEach(link => {
    if (link.getAttribute('href') === 'login.html') {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("kosUser");
        window.location.href = "login.html";
      });
    }
  });
});
