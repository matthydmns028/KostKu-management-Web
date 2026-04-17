document.addEventListener("DOMContentLoaded", () => {
  // === 1. MANAJEMEN DATABASE BACKEND (NODE.JS + SQLITE) ===
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const dbKey = 'db_' + currentPage.replace('.html', ''); 

  const table = document.querySelector('.data-table');
  const tbody = table ? table.querySelector('tbody') : null;

  // Menyimpan tabel ke Database SQLite API
  const saveTableData = async () => {
    if (tbody) {
      try {
        await fetch('http://localhost:3000/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: dbKey, html: tbody.innerHTML })
        });
      } catch (e) {
        console.warn('Server offline: Data urung dimuat (masih default HTML)', e);
      }
    }
  };

  // Memuat data dari Database
  const loadTableData = async () => {
    if (tbody) {
      try {
        const res = await fetch(`http://localhost:3000/api/load/${dbKey}`);
        const data = await res.json();
        if (data.html) {
          tbody.innerHTML = data.html; 
        }
      } catch(e) {
        console.warn('Server offline: Data urung dimuat (masih default HTML)', e);
      }
    }
  };

  loadTableData();

  // === 2. EVENT SIDEBAR (NAVIGASI) ===
  const sidebarLinks = document.querySelectorAll(".sidebar-menu li");
  sidebarLinks.forEach((link) => {
    const aTag = link.querySelector("a");
    if (aTag && aTag.getAttribute("href") === currentPage) {
      sidebarLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    }
  });

  // === 3. EVENT DELEGATION UNTUK SEMUA TOMBOL AKSI ===
  document.body.addEventListener("click", function (e) {
    
    // --- A. Tombol Hapus / Tolak ---
    const btnHapusTolak = e.target.closest('.btn-hapus') || e.target.closest('.btn-tolak');
    if (btnHapusTolak) {
      e.preventDefault();
      const row = btnHapusTolak.closest('tr');
      if (row) {
        const targetName = row.children[0].textContent.trim();
        const aksi = btnHapusTolak.classList.contains('btn-hapus') ? 'mengapus' : 'menolak';
        if (confirm(`Apakah Anda yakin ingin ${aksi} data ${targetName}?`)) {
          row.style.transition = 'opacity 0.4s ease';
          row.style.opacity = '0';
          setTimeout(() => {
            row.remove();
            saveTableData(); // Simpan perubahan di SQLite
          }, 400);
        }
      }
      return;
    }

    // --- B. Tombol Edit (Popup) ---
    const btnEdit = e.target.closest('.btn-edit');
    if (btnEdit) {
      e.preventDefault();
      const row = btnEdit.closest('tr');
      if (row) {
        const headers = table.querySelectorAll('th');
        const cells = row.querySelectorAll('td');

        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        let inputsHTML = "";
        let fieldIds = []; 

        for (let i = 0; i < cells.length - 1; i++) {
          const headerText = headers[i].textContent.trim();
          if (cells[i].querySelector('.badge')) continue; 

          const currentValue = cells[i].textContent.trim();
          const fieldId = `edit_modal_${i}`;
          fieldIds.push({ index: i, id: fieldId });
          
          inputsHTML += `
            <div class="form-group-modal">
              <label for="${fieldId}">${headerText}</label>
              <input type="text" id="${fieldId}" value="${currentValue}" />
            </div>
          `;
        }

        overlay.innerHTML = `
          <div class="modal-content">
            <div class="modal-header">
              <h3>Edit Data</h3>
              <button class="close-btn">&times;</button>
            </div>
            <div class="modal-body">${inputsHTML}</div>
            <div class="modal-footer">
              <button class="btn btn-danger btn-batal-modal">Batal</button>
              <button class="btn btn-primary btn-simpan-modal">Simpan Perubahan</button>
            </div>
          </div>
        `;
        
        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add("show"), 10);
        
        const closeModal = () => {
          overlay.classList.remove("show");
          setTimeout(() => overlay.remove(), 300);
        };
        
        overlay.querySelector(".close-btn").addEventListener("click", closeModal);
        overlay.querySelector(".btn-batal-modal").addEventListener("click", closeModal);
        
        overlay.querySelector(".btn-simpan-modal").addEventListener("click", () => {
          fieldIds.forEach(field => {
            const val = overlay.querySelector(`#${field.id}`).value;
            if (val.trim() !== '') {
              cells[field.index].textContent = val;
            }
          });
          saveTableData(); // Simpan SQLite
          closeModal();
        });
      }
      return;
    }

    // --- C. Tombol Setuju / Lunas ---
    const btnSetuju = e.target.closest('.btn-setuju');
    if (btnSetuju) {
      e.preventDefault();
      const row = btnSetuju.closest('tr');
      if (row) {
        if (confirm("Apakah pembayaran sudah valid dan ingin disetujui?")) {
          const badge = row.querySelector('.badge');
          if (badge) {
            badge.className = 'badge badge-selesai-bg';
            badge.textContent = 'Lunas';
          }
          btnSetuju.textContent = 'Disetujui';
          btnSetuju.disabled = true;
          btnSetuju.style.opacity = '0.5';
          btnSetuju.style.cursor = 'not-allowed';
          
          const btnTolak = row.querySelector('.btn-tolak');
          if (btnTolak) btnTolak.remove();
          
          saveTableData(); // Simpan Data
        }
      }
      return;
    }

    // --- D. Tombol Proses / Selesai (Pengaduan dll) ---
    const btnAksiProses = e.target.closest('.btn-proses') || e.target.closest('.btn-selesai-action');
    if (btnAksiProses) {
      e.preventDefault();
      const row = btnAksiProses.closest('tr');
      if (row) {
        const isProses = btnAksiProses.classList.contains('btn-proses');
        const kelasBadge = isProses ? 'badge-warning' : 'badge-selesai-bg';
        const teksBadge = isProses ? 'Diproses' : 'Selesai';
        
        if (confirm(`Ubah status laporan menjadi ${teksBadge}?`)) {
          const badge = row.querySelector('.badge');
          if (badge) {
            badge.className = `badge ${kelasBadge}`;
            badge.textContent = teksBadge;
          }
          if (!isProses) {
            btnAksiProses.remove();
            const btnProsesHide = row.querySelector('.btn-proses');
            if (btnProsesHide) btnProsesHide.remove();
          }
          saveTableData(); 
        }
      }
      return;
    }

    // --- E. Tombol Tambah Data (Popup Create) ---
    const btnTambah = e.target.closest('.btn-primary-light') || e.target.closest('.btn-primary');
    if (btnTambah && !btnTambah.closest('.login-btn')) {
      if (btnTambah.tagName.toLowerCase() !== 'a' && btnTambah.getAttribute('type') !== 'submit') {
        e.preventDefault();
        const namaTombol = btnTambah.textContent.trim();
        const namaTombolLower = namaTombol.toLowerCase();
        
        if (namaTombolLower.includes('tambah') || namaTombolLower.includes('kirim') || namaTombolLower.includes('generate')) {
          if (tbody) {
            let baseRow = tbody.querySelector('tr');
            if (baseRow) {
              const headers = table.querySelectorAll('th');
              const cells = baseRow.querySelectorAll('td');
              
              const overlay = document.createElement("div");
              overlay.className = "modal-overlay";
              let inputsHTML = "";
              let fieldIds = []; 
              
              for (let i = 0; i < cells.length - 1; i++) {
                const headerText = headers[i].textContent.trim();
                if (cells[i].querySelector('.badge')) continue;
                
                const fieldId = `input_modal_${i}`;
                fieldIds.push({ index: i, id: fieldId });
                inputsHTML += `
                  <div class="form-group-modal">
                    <label for="${fieldId}">${headerText}</label>
                    <input type="text" id="${fieldId}" placeholder="Masukkan ${headerText}" />
                  </div>
                `;
              }
              
              overlay.innerHTML = `
                <div class="modal-content">
                  <div class="modal-header">
                    <h3>${namaTombol}</h3>
                    <button class="close-btn">&times;</button>
                  </div>
                  <div class="modal-body">${inputsHTML}</div>
                  <div class="modal-footer">
                    <button class="btn btn-danger btn-batal-modal">Batal</button>
                    <button class="btn btn-primary btn-simpan-modal">Simpan Data</button>
                  </div>
                </div>`;
              
              document.body.appendChild(overlay);
              setTimeout(() => overlay.classList.add("show"), 10);
              
              const closeModal = () => {
                overlay.classList.remove("show");
                setTimeout(() => overlay.remove(), 300);
              };
              
              overlay.querySelector(".close-btn").addEventListener("click", closeModal);
              overlay.querySelector(".btn-batal-modal").addEventListener("click", closeModal);
              
              overlay.querySelector(".btn-simpan-modal").addEventListener("click", () => {
                const newRow = baseRow.cloneNode(true);
                const newCells = newRow.querySelectorAll('td');
                
                fieldIds.forEach(field => {
                  const val = overlay.querySelector(`#${field.id}`).value;
                  newCells[field.index].textContent = val || "-";
                });
                
                for (let i = 0; i < newCells.length - 1; i++) {
                  const badge = newCells[i].querySelector('.badge');
                  if (badge) {
                    badge.textContent = "Baru";
                    badge.className = "badge badge-warning";
                  }
                }
                
                newRow.style.opacity = '1';
                newRow.style.transition = 'none'; 
                
                const actCell = newCells[newCells.length - 1];
                actCell.innerHTML = `<div class="action-cell"><button class="btn btn-sm btn-edit">Edit</button> <button class="btn btn-sm btn-hapus">Hapus</button></div>`;
                
                tbody.insertBefore(newRow, tbody.firstChild); 
                saveTableData(); // SIMPAN BARIS BARU KE DATABASE 
                closeModal();
              });
            } else {
               alert("Tabel Kosong, tidak bisa diduplikasi");
            }
          }
        }
      }
    }
  });
});
