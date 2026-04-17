document.addEventListener("DOMContentLoaded", () => {
    // --- PENANGANAN LOGIN ---
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
                const res = await fetch("http://localhost:3000/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();
                if (data.success) {
                    alert(data.message);
                    localStorage.setItem("kosUser", JSON.stringify(data.user));
                    
                    // Redirect berdasarkan role
                    if (data.user.role === "admin") {
                        window.location.href = "index.html";
                    } else {
                        window.location.href = "user-dashboard.html"; // Redirect ke halaman Penghuni Dashboard
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

    // --- PENANGANAN REGISTER ---
    const registerForm = document.querySelector("#registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = registerForm.querySelector("button[type='submit']");
            
            const nama = registerForm.querySelector("#namaLengkap").value.trim();
            const username = registerForm.querySelector("#username").value.trim();
            const password = registerForm.querySelector("#password").value.trim();
            const role = registerForm.querySelector("#role").value;

            if (!nama || !username || !password) return alert("Semua field teks harus diisi.");

            btn.disabled = true;
            btn.innerHTML = 'Memproses...';

            try {
                const res = await fetch("http://localhost:3000/api/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nama, username, password, role })
                });

                const data = await res.json();
                if (data.success) {
                    alert("Pendaftaran berhasil! Silakan login.");
                    window.location.href = "login.html";
                } else {
                    alert(data.error || "Gagal membuat akun.");
                }
            } catch (err) {
                console.error(err);
                alert("Kesalahan koneksi ke server.");
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Daftar';
            }
        });
    }

    // --- PENGAMANAN HALAMAN DASBHOARD/USER (OPSIONAL) ---
    // Logika jika di halaman yang harus login:
    const requiresAuth = ["index.html", "kamar.html", "laporan.html", "pembayaran.html", "penghuni.html", "notifikasi.html", "pengaduan.html", "user.html"];
    const currentPage = window.location.pathname.split("/").pop() || "index.html";

    if (requiresAuth.includes(currentPage)) {
        const user = JSON.parse(localStorage.getItem("kosUser"));
        if (!user) {
            // alert("Anda belum login! Mohon login terlebih dahulu.");
            // Karena ini file lama dan belum ada integrasi murni, kita izinkan berjalan, namun di skenario nyata akan ter-redirect
            // window.location.href = "login.html";
        } else {
            console.log(`Login sebagai: ${user.nama} (${user.role})`);
            // Custom UI berdasarkan log in user jika diperlukan.
            const userIcon = document.querySelector('.navbar-user');
            if (userIcon) {
              const span = document.createElement('span');
              span.style.color = '#fff';
              span.style.marginRight = '10px';
              span.style.fontWeight = 'bold';
              span.textContent = `Hai, ${user.nama} (${user.role})`;
              userIcon.insertBefore(span, userIcon.firstChild);
            }
        }
    }
    
    // --- HANDLE LOGOUT LINTAS HALAMAN ---
    const logoutBtn = document.querySelector("a[href='login.html']");
    if (logoutBtn && logoutBtn.textContent.trim().toLowerCase() === "logout") { 
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("kosUser");
            alert("Anda telah logout.");
            window.location.href = "login.html";
        });
    }
});
