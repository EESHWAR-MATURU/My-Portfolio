// --- STICKY HEADER ON SCROLL ---
const header = document.querySelector(".header");

window.addEventListener("scroll", () => {
  header.classList.toggle("sticky", window.scrollY > 0);
});

// --- MOBILE MENU TOGGLE ---
const menuIcon = document.querySelector("#menu-icon");
const navlist = document.querySelector(".navlist");

menuIcon.addEventListener("click", () => {
  // Toggle the 'bx-x' class to change the icon
  menuIcon.classList.toggle("bx-x");
  // Toggle the 'open' class to show/hide the navlist
  navlist.classList.toggle("open");
});

// --- CLOSE MOBILE MENU WHEN A LINK IS CLICKED ---
window.addEventListener("click", (e) => {
  if (e.target.matches(".navlist a")) {
    menuIcon.classList.remove("bx-x");
    navlist.classList.remove("open");
  }
});

// --- ACTIVE LINK HIGHLIGHTING ON SCROLL ---
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".navlist a");

window.addEventListener("scroll", () => {
  let current = "";

  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (pageYOffset >= sectionTop - sectionHeight / 3) {
      current = section.getAttribute("id");
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === "#" + current) {
      link.classList.add("active");
    }
  });
});
