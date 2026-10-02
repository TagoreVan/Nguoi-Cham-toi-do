const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-nav');
const navLinks = document.querySelectorAll('#site-nav a');

function closeMenu() {
  if (!menuButton || !navigation) return;
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.querySelector('.sr-only').textContent = 'Mở menu';
}

if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const opening = !navigation.classList.contains('is-open');
    navigation.classList.toggle('is-open', opening);
    menuButton.setAttribute('aria-expanded', String(opening));
    menuButton.querySelector('.sr-only').textContent = opening ? 'Đóng menu' : 'Mở menu';
  });
  navLinks.forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
}

const stops = {
  'huu-duc': { name: 'Hữu Đức', location: 'Hữu Đức, Ninh Thuận' },
  'hau-sanh': { name: 'Hậu Sanh', location: 'Hậu Sanh, Ninh Thuận' },
  'po-klong': { name: 'Pô Klaong Girai', location: 'Tháp Po Klaong Girai, Ninh Thuận' },
  'po-rome': { name: 'Porome', location: 'Tháp Porome, Ninh Thuận' },
  'po-ina': { name: 'Po Ina Nagar', location: 'Đền Po Ina Nagar, Ninh Thuận' },
  'hoai-trung': { name: 'Hoài Trung', location: 'Hoài Trung, Ninh Thuận' },
  'bau-truc': { name: 'Bàu Trúc', location: 'Bàu Trúc, Ninh Thuận' },
  'vu-bon': { name: 'Vụ Bổn', location: 'Vụ Bổn, Ninh Thuận' },
  'hieu-thien': { name: 'Hiếu Thiện', location: 'Hiếu Thiện, Ninh Thuận' },
};
const storageKey = 'nang-tren-thap-itinerary-v1';
const planner = document.querySelector('[data-planner]');

document.querySelectorAll('[data-map-query]').forEach((link) => {
  link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(link.dataset.mapQuery)}`;
});

if (planner) {
  const dayButtons = planner.querySelectorAll('[data-planner-day]');
  const addButtons = planner.querySelectorAll('[data-add-stop]');
  const dayLists = planner.querySelectorAll('[data-itinerary-day]');
  const dayLabel = planner.querySelector('[data-active-day-label]');
  const feedback = planner.querySelector('[data-planner-feedback]');
  const routeButton = planner.querySelector('[data-route-button]');
  const shareButton = planner.querySelector('[data-share-plan]');
  const shareOutput = planner.querySelector('[data-share-output]');
  const shareLink = planner.querySelector('[data-share-link]');
  let activeDay = '1';
  const itinerary = { '1': [], '2': [] };

  function normalizePlan(value) {
    if (!value || typeof value !== 'object') return null;
    return Object.fromEntries(['1', '2'].map((day) => [
      day,
      Array.isArray(value[day]) ? [...new Set(value[day].filter((id) => Object.hasOwn(stops, id)))] : [],
    ]));
  }

  function readInitialPlan() {
    const sharedPlan = new URL(location.href).searchParams.get('lich-trinh');
    if (sharedPlan) {
      try {
        const parsed = normalizePlan(JSON.parse(sharedPlan));
        if (parsed) return parsed;
      } catch {
        // Ignore malformed shared links and fall back to the locally saved plan.
      }
    }

    try {
      return normalizePlan(JSON.parse(localStorage.getItem(storageKey))) || { '1': [], '2': [] };
    } catch {
      return { '1': [], '2': [] };
    }
  }

  function savePlan() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(itinerary));
      feedback.textContent = 'Lịch trình đã được lưu trên trình duyệt này.';
    } catch {
      feedback.textContent = 'Không thể lưu trên thiết bị này. Lịch vẫn còn trong phiên hiện tại.';
    }
  }

  function updateRoute() {
    const selected = [...itinerary['1'], ...itinerary['2']].map((id) => stops[id].location);
    routeButton.disabled = selected.length === 0;
    if (selected.length === 0) return;

    const params = new URLSearchParams({ api: '1' });
    if (selected.length === 1) {
      params.set('query', selected[0]);
      routeButton.dataset.mapUrl = `https://www.google.com/maps/search/?${params}`;
    } else {
      params.set('origin', selected[0]);
      params.set('destination', selected.at(-1));
      if (selected.length > 2) params.set('waypoints', selected.slice(1, -1).join('|'));
      params.set('travelmode', 'driving');
      routeButton.dataset.mapUrl = `https://www.google.com/maps/dir/?${params}`;
    }
  }

  function render() {
    dayLists.forEach((list) => {
      const day = list.dataset.itineraryDay;
      list.replaceChildren();
      if (itinerary[day].length === 0) {
        const empty = document.createElement('li');
        empty.className = 'empty-plan';
        empty.textContent = 'Chưa có điểm dừng.';
        list.append(empty);
        return;
      }

      itinerary[day].forEach((id) => {
        const item = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = stops[id].name;
        const location = document.createElement('small');
        location.textContent = stops[id].location;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'remove-stop';
        remove.dataset.removeStop = id;
        remove.dataset.removeDay = day;
        remove.setAttribute('aria-label', `Xóa ${stops[id].name} khỏi Ngày ${day}`);
        remove.textContent = 'Xóa';
        const details = document.createElement('div');
        details.append(label, location);
        item.append(details, remove);
        list.append(item);
      });
    });

    addButtons.forEach((button) => {
      const stop = stops[button.dataset.addStop];
      const added = itinerary[activeDay].includes(button.dataset.addStop);
      button.disabled = added;
      button.textContent = added ? 'Đã thêm' : 'Thêm';
      button.setAttribute('aria-label', added ? `${stop.name} đã có trong Ngày ${activeDay}` : `Thêm ${stop.name} vào Ngày ${activeDay}`);
    });
    dayButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.plannerDay === activeDay)));
    dayLabel.textContent = `Đang thêm điểm vào Ngày ${activeDay}`;
    updateRoute();
  }

  Object.assign(itinerary, readInitialPlan());
  render();

  dayButtons.forEach((button) => button.addEventListener('click', () => {
    activeDay = button.dataset.plannerDay;
    render();
  }));

  addButtons.forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.addStop;
    if (!itinerary[activeDay].includes(id)) itinerary[activeDay].push(id);
    shareOutput.hidden = true;
    render();
    savePlan();
  }));

  planner.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-stop]');
    if (!removeButton) return;
    const day = removeButton.dataset.removeDay;
    itinerary[day] = itinerary[day].filter((id) => id !== removeButton.dataset.removeStop);
    shareOutput.hidden = true;
    render();
    savePlan();
  });

  routeButton.addEventListener('click', () => {
    if (routeButton.dataset.mapUrl) window.open(routeButton.dataset.mapUrl, '_blank', 'noopener,noreferrer');
  });

  shareButton.addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.set('lich-trinh', JSON.stringify(itinerary));
    shareLink.value = url.href;
    shareOutput.hidden = false;
    shareLink.focus();
    shareLink.select();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url.href).then(
        () => { feedback.textContent = 'Đã sao chép liên kết lịch trình.'; },
        () => { feedback.textContent = 'Liên kết đã sẵn sàng. Hãy sao chép để chia sẻ.'; },
      );
    } else {
      feedback.textContent = 'Liên kết đã sẵn sàng. Hãy sao chép để chia sẻ.';
    }
  });

  planner.querySelector('[data-copy-link]').addEventListener('click', async () => {
    shareLink.focus();
    shareLink.select();
    try {
      await navigator.clipboard.writeText(shareLink.value);
      feedback.textContent = 'Đã sao chép liên kết lịch trình.';
    } catch {
      feedback.textContent = 'Liên kết đã được chọn. Nhấn Ctrl+C hoặc giữ để sao chép.';
    }
  });
}
