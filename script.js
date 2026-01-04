const items = [
  "Silent Shadows", "Lonely Light", "Quiet Void", "Fading Contrast", "Empty Horizon",
  "Monochrome Silence", "Dark Whisper", "Pale Echo", "Stark Solitude", "Bleak Reflection",
  "Isolated Shade", "Muted Dusk", "Grey Emptiness", "Cold Absence", "Bare Twilight",
  "Still Dusk", "Vacant Gloom", "Quiet Eclipse", "Dim Silence", "Hollow Night"
];

const container = document.querySelector(".container") || document.body;
const canvas = document.querySelector(".canvas") || container;
const overlay = document.querySelector(".overlay");
const projectTitleElem = document.querySelector(".project-title p");
const nav = document.querySelector('nav');

const itemCount = 20, itemGap = 150, columns = 4, itemWidth = 120, itemHeight = 160;
const panStrength = 0.4, panRange = 250;

let isDragging = false, startX, startY, targetX = 0, targetY = 0, currentX = 0, currentY = 0;
let dragVelocityX = 0, dragVelocityY = 0, lastDragTime = 0, mouseHasMoved = false;
let visibleItems = new Set(), lastUpdateTime = 0, lastX = 0, lastY = 0;
let isExpanded = false, activeItem = null, canDrag = true, originalPosition = null;
let expandedItem = null, activeItemId = null, titleSplit = null, isAnimatingTitle = false;
let hoveredItem = null, initialAnimationDone = false, initialVisibleItems = new Set();
let panTargetX = 0, panTargetY = 0, panCurrentX = 0, panCurrentY = 0, panActive = false, panAnimation = null;
let frozenPanX = 0, frozenPanY = 0, isPanningFrozen = false, waitingForMouseMove = false;
let lastMouseX = 0, lastMouseY = 0;

/**
 * Initializes the navigation bar animation by checking if GSAP is loaded
 * and triggering the animation once it's available
 */
function initNavAnimation() {
  if (!nav) return;
  const check = () => {
    if (typeof gsap !== 'undefined') performNavAnimation();
    else setTimeout(check, 10);
  };
  check();
}

/**
 * Performs the GSAP animation for the navigation bar,
 * sliding it up from the bottom with a fade-in effect
 */
function performNavAnimation() {
  nav.style.opacity = '0';
  nav.style.transform = 'translateY(100%)';
  
  gsap.to(nav, {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: "power3.out",
    delay: 0.1,
    onComplete: startLoadingAnimation
  });
}

/**
 * Calculates which grid items should be visible on initial load
 * based on the viewport dimensions and buffer area
 * @returns {Set} Set of item IDs in "col,row" format
 */
function getInitialVisibleItems() {
  const vw = window.innerWidth, vh = window.innerHeight, buffer = 1;
  const startCol = Math.floor(-vw * buffer / (itemWidth + itemGap));
  const endCol = Math.ceil(vw * buffer / (itemWidth + itemGap));
  const startRow = Math.floor(-vh * buffer / (itemHeight + itemGap));
  const endRow = Math.ceil(vh * buffer / (itemHeight + itemGap));
  const items = new Set();
  for (let row = startRow; row <= endRow; row++)
    for (let col = startCol; col <= endCol; col++)
      items.add(`${col},${row}`);
  return items;
}

/**
 * Creates a DOM element for a single gallery item at a specific grid position
 * @param {number} col - Column position in the grid
 * @param {number} row - Row position in the grid
 * @param {string} itemId - Unique identifier for the item
 * @param {boolean} isInitial - Whether this is part of the initial load animation
 * @returns {HTMLElement} The created item element
 */
function createItemElement(col, row, itemId, isInitial = false) {
  const item = document.createElement("div");
  item.className = "item";
  item.id = itemId;
  item.style.left = `${col * (itemWidth + itemGap)}px`;
  item.style.top = `${row * (itemHeight + itemGap)}px`;
  item.dataset.col = col;
  item.dataset.row = row;

  const itemNum = (Math.abs(row * columns + col) % itemCount) + 1;
  const img = document.createElement("img");
  img.dataset.src = `public/${itemNum}.jpg`;
  img.alt = `Image ${itemNum}`;
  img.className = 'lazy-image';
  item.appendChild(img);

  if (isInitial) {
    item.style.opacity = '0';
    item.style.transform = 'translateY(64px) scale(1.5) rotateX(40deg)';
    item.style.transition = 'none';
  }

  item.addEventListener("mouseenter", () => {
    if (!canDrag || isDragging || isExpanded) return;
    hoveredItem = item;
    window.gsap && gsap.to(item, { scale: 1.2, duration: 0.3, ease: "power2.out" });
  });

  item.addEventListener("mouseleave", () => {
    if (!canDrag || isDragging || isExpanded) return;
    if (hoveredItem === item) hoveredItem = null;
    window.gsap && gsap.to(item, { scale: 1, duration: 0.3, ease: "power2.out" });
  });

  item.addEventListener("click", () => {
    if (mouseHasMoved || isDragging) return;
    handleItemClick(item);
  });

  return item;
}

/**
 * Properly cleans up an image element to free memory
 * @param {HTMLImageElement} img - The image element to clean up
 */
function cleanupImage(img) {
  if (!img) return;
  img.onload = null;
  img.onerror = null;
  if (img.src) {
    img.src = '';
    img.removeAttribute('src');
  }
}

/**
 * Lazy loads an image with a fade-in and scale animation
 * @param {HTMLImageElement} img - The image element to load
 */
function lazyLoadImage(img) {
  if (img.src || !img.dataset.src) return;
  
  img.style.opacity = '0';
  img.style.transform = 'scale(1.1)';
  
  img.onload = () => {
    if (window.gsap) {
      gsap.to(img, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" });
    } else {
      img.style.transition = 'all 0.5s ease-out';
      img.style.opacity = '1';
      img.style.transform = 'scale(1)';
    }
  };
  
  img.src = img.dataset.src;
}

/**
 * Checks which images are currently in the viewport and triggers lazy loading for them
 * Includes a buffer zone around the viewport for smoother loading
 */
function checkLazyImages() {
  const images = document.querySelectorAll('.lazy-image:not([src])');
  const vw = window.innerWidth, vh = window.innerHeight, buffer = 150;
  
  images.forEach(img => {
    const rect = img.getBoundingClientRect();
    if (rect.left < vw + buffer && rect.right > -buffer &&
        rect.top < vh + buffer && rect.bottom > -buffer) {
      lazyLoadImage(img);
    }
  });
}

/**
 * Creates the initial set of visible gallery items on page load
 * and adds them to the canvas
 */
function createInitialItems() {
  initialVisibleItems = getInitialVisibleItems();
  initialVisibleItems.forEach(itemId => {
    const [col, row] = itemId.split(',').map(Number);
    const item = createItemElement(col, row, itemId, true);
    canvas.appendChild(item);
    visibleItems.add(itemId);
  });
}

/**
 * Initiates the loading animation sequence, checking if GSAP is available
 * and falling back to CSS transitions if not
 */
function startLoadingAnimation() {
  if (typeof gsap === 'undefined') {
    const startTime = Date.now();
    const check = () => {
      if (typeof gsap !== 'undefined') performLoadingAnimation();
      else if (Date.now() - startTime < 200) setTimeout(check, 1);
      else performLoadingAnimationFallback();
    };
    check();
    return;
  }
  performLoadingAnimation();
}

/**
 * Performs the GSAP-based loading animation for initial gallery items
 * with staggered fade-in and transform effects
 */
function performLoadingAnimation() {
  if (typeof CustomEase !== 'undefined') {
    gsap.registerPlugin(CustomEase);
    CustomEase.create("hop", "0.9, 0, 0.1, 1");
  }

  const initialItems = Array.from(document.querySelectorAll('.item'));
  
  gsap.to(initialItems, {
    opacity: 1, y: 0, scale: 1, rotateX: 0,
    duration: 1.3,
    stagger: 0.015,
    ease: typeof CustomEase !== 'undefined' ? "hop" : "power2.out",
    onStart: checkLazyImages,
    onComplete: () => {
      initialAnimationDone = true;
      checkLazyImages();
    }
  });
}

/**
 * Fallback loading animation using CSS transitions when GSAP is unavailable
 */
function performLoadingAnimationFallback() {
  const initialItems = Array.from(document.querySelectorAll('.item'));
  initialItems.forEach((item, i) => {
    setTimeout(() => {
      item.style.transition = 'all 0.4s ease-out';
      item.style.opacity = '1';
      item.style.transform = 'translateY(0px) scale(1) rotateX(0deg)';
    }, i * 15);
  });
  setTimeout(() => {
    initialAnimationDone = true;
    checkLazyImages();
  }, initialItems.length * 15 + 400);
}

/**
 * Sets the title text and prepares it for animation using SplitType
 * @param {string} title - The title text to display
 */
function setAndAnimateTitle(title) {
  if (!projectTitleElem) return;
  if (titleSplit) titleSplit.revert();
  projectTitleElem.textContent = title;
  projectTitleElem.style.fontSize = '2em';
  projectTitleElem.style.overflow = 'hidden';

  if (typeof SplitType !== 'undefined') {
    titleSplit = new SplitType(projectTitleElem, { types: "words" });
    window.gsap && gsap.set(titleSplit.words, { y: "100%" });
  }
}

/**
 * Animates the title in with a staggered word-by-word reveal effect
 */
function animateTitleIn() {
  if (isAnimatingTitle || !titleSplit || !window.gsap) return;
  isAnimatingTitle = true;
  gsap.to(titleSplit.words, {
    y: "0%", duration: 0.8, stagger: 0.08, ease: "power3.out",
    onComplete: () => isAnimatingTitle = false
  });
}

/**
 * Animates the title out with a staggered word-by-word hide effect
 * @param {Function} callback - Function to call after animation completes
 */
function animateTitleOut(callback) {
  if (isAnimatingTitle || !titleSplit || !window.gsap) return;
  isAnimatingTitle = true;
  gsap.to(titleSplit.words, {
    y: "-100%", duration: 0.8, stagger: 0.08, ease: "power3.out",
    onComplete: () => {
      isAnimatingTitle = false;
      titleSplit && titleSplit.revert();
      if (projectTitleElem) {
        projectTitleElem.textContent = '';
        projectTitleElem.style.fontSize = '1em';
        projectTitleElem.style.overflow = 'visible';
      }
      callback && callback();
    }
  });
}

/**
 * Handles mouse movement to create a subtle panning effect based on cursor position
 * The canvas slightly follows the mouse for a parallax-like effect
 * @param {MouseEvent} e - The mouse event
 */
function handleMousePan(e) {
  const mouseX = e.clientX, mouseY = e.clientY;

  if (waitingForMouseMove) {
    if (Math.abs(mouseX - lastMouseX) > 5 || Math.abs(mouseY - lastMouseY) > 5) {
      waitingForMouseMove = false;
      isPanningFrozen = false;
      const newPanX = (mouseX / window.innerWidth - 0.5) * panRange * panStrength;
      const newPanY = (mouseY / window.innerHeight - 0.5) * panRange * panStrength;
      if (window.gsap) {
        gsap.to(window, {
          panCurrentX: newPanX, panCurrentY: newPanY,
          duration: 0.5, ease: "power2.out",
          onUpdate: () => { panTargetX = newPanX; panTargetY = newPanY; }
        });
      } else {
        panCurrentX = newPanX;
        panCurrentY = newPanY;
      }
    } else return;
  }

  if (!canDrag || isDragging || isExpanded || isPanningFrozen) return;

  panTargetX = (mouseX / window.innerWidth - 0.5) * panRange * panStrength;
  panTargetY = (mouseY / window.innerHeight - 0.5) * panRange * panStrength;

  if (!panActive) {
    panActive = true;
    startPanAnimation();
  }
}

/**
 * Starts the smooth GSAP animation for the panning effect
 */
function startPanAnimation() {
  if (!window.gsap) return;
  panAnimation && panAnimation.kill();
  panAnimation = gsap.to({}, {
    duration: 2, ease: "power2.out",
    onUpdate: () => {
      if (!canDrag || isDragging || isExpanded || isPanningFrozen) return;
      panCurrentX += (panTargetX - panCurrentX) * 0.08;
      panCurrentY += (panTargetY - panCurrentY) * 0.08;
    },
    onComplete: () => panActive = false
  });
}

/**
 * Updates which items are visible in the viewport based on the current canvas position
 * Dynamically creates new items and removes items that are out of view
 */
function updateVisibleItems() {
  const buffer = 1.5; // Reduced buffer for better memory management
  const vw = window.innerWidth * (1 + buffer), vh = window.innerHeight * (1 + buffer);
  const movingRight = targetX > currentX, movingDown = targetY > currentY;
  const dirBufX = movingRight ? -200 : 200, dirBufY = movingDown ? -200 : 200;

  const startCol = Math.floor((-currentX - vw / 2 + (movingRight ? dirBufX : 0)) / (itemWidth + itemGap));
  const endCol = Math.ceil((-currentX + vw / 2 + (!movingRight ? dirBufX : 0)) / (itemWidth + itemGap));
  const startRow = Math.floor((-currentY - vh / 2 + (movingDown ? dirBufY : 0)) / (itemHeight + itemGap));
  const endRow = Math.ceil((-currentY + vh / 2 + (!movingDown ? dirBufY : 0)) / (itemHeight + itemGap));

  const currentItems = new Set();

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const itemId = `${col},${row}`;
      currentItems.add(itemId);

      if (visibleItems.has(itemId) || (activeItemId === itemId && isExpanded)) continue;

      const item = createItemElement(col, row, itemId, false);
      
      if (initialAnimationDone && window.gsap) {
        gsap.fromTo(item, 
          { opacity: 0, y: 64, scale: 1.5, rotateX: 40 },
          { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 0.4,
            ease: typeof CustomEase !== 'undefined' ? "hop" : "power2.out",
            onComplete: () => {
              const img = item.querySelector('.lazy-image');
              img && lazyLoadImage(img);
            }
          }
        );
      }

      canvas.appendChild(item);
      visibleItems.add(itemId);
    }
  }

  visibleItems.forEach(itemId => {
    if (!currentItems.has(itemId) || (activeItemId === itemId && isExpanded)) {
      const item = document.getElementById(itemId);
      if (item && canvas.contains(item)) {
        // Properly unload image to free memory
        const img = item.querySelector('img');
        cleanupImage(img);
        canvas.removeChild(item);
      }
      visibleItems.delete(itemId);
    }
  });
  
  checkLazyImages();
}

/**
 * Handles click events on gallery items to expand or close them
 * @param {HTMLElement} item - The clicked gallery item
 */
function handleItemClick(item) {
  isExpanded ? expandedItem && closeExpandedItem() : expandItem(item);
}

/**
 * Expands a gallery item to full screen with smooth GSAP animation
 * Displays the item title and blurs/fades out other items
 * @param {HTMLElement} item - The gallery item to expand
 */
function expandItem(item) {
  if (!window.gsap) return;

  isExpanded = true;
  activeItem = item;
  activeItemId = item.id;
  canDrag = false;
  container.style.cursor = "auto";

  frozenPanX = panCurrentX;
  frozenPanY = panCurrentY;
  isPanningFrozen = true;
  lastMouseX = window.event?.clientX || 0;
  lastMouseY = window.event?.clientY || 0;
  panTargetX = 0;
  panTargetY = 0;
  panAnimation && (panAnimation.kill(), panActive = false);

  const imgSrc = item.querySelector("img").src || item.querySelector("img").dataset.src;
  const imgMatch = imgSrc.match(/\/(\d+)\.jpg/);
  const imgNum = imgMatch ? parseInt(imgMatch[1]) : 1;

  setAndAnimateTitle(items[(imgNum - 1) % items.length]);
  item.style.visibility = "hidden";

  const rect = item.getBoundingClientRect();
  const targetImg = imgSrc;

  originalPosition = {
    id: item.id, rect, imgSrc: targetImg,
    originalScale: hoveredItem === item ? 1.2 : 1,
    originalLeft: parseFloat(item.style.left),
    originalTop: parseFloat(item.style.top)
  };

  overlay && overlay.classList.add("active");

  expandedItem = document.createElement("div");
  expandedItem.className = "expanded-item";
  expandedItem.style.width = `${itemWidth}px`;
  expandedItem.style.height = `${itemHeight}px`;

  const img = document.createElement("img");
  img.src = targetImg;
  expandedItem.appendChild(img);
  expandedItem.addEventListener("click", closeExpandedItem);
  document.body.appendChild(expandedItem);

  document.querySelectorAll(".item").forEach(el => {
    el !== activeItem && gsap.to(el, { opacity: 0, filter: "blur(5px)", duration: 0.3, ease: "power2.out" });
  });

  const targetHeight = window.innerHeight * 0.85;
  const targetWidth = targetHeight * (itemWidth / itemHeight);
  const startScale = originalPosition.originalScale;

  gsap.fromTo(expandedItem,
    { width: itemWidth * startScale, height: itemHeight * startScale,
      x: rect.left + (itemWidth * startScale) / 2 - window.innerWidth / 2,
      y: rect.top + (itemHeight * startScale) / 2 - window.innerHeight / 2 },
    { width: targetWidth, height: targetHeight, x: 0, y: 0,
      duration: 1, ease: typeof CustomEase !== 'undefined' ? "hop" : "power2.out" }
  );

  gsap.delayedCall(0.5, animateTitleIn);
}

/**
 * Closes the expanded item and animates it back to its original position in the grid
 * Restores all other items to their normal state
 */
function closeExpandedItem() {
  if (!expandedItem || !originalPosition || !window.gsap) return;

  animateTitleOut(() => {});

  gsap.delayedCall(0.3, () => {
    overlay && overlay.classList.remove("active");

    // Use the stored rect position from when item was clicked
    const clickedScale = originalPosition.originalScale;
    const screenX = originalPosition.rect.left + (itemWidth * clickedScale) / 2;
    const screenY = originalPosition.rect.top + (itemHeight * clickedScale) / 2;

    document.querySelectorAll(".item").forEach(el => {
      el.id !== activeItemId && gsap.to(el, { opacity: 1, filter: "blur(0px)", duration: 0.3, ease: "power2.out" });
    });

    const originalItem = document.getElementById(activeItemId);

    gsap.to(expandedItem, {
      width: itemWidth, height: itemHeight,
      x: screenX - window.innerWidth / 2, y: screenY - window.innerHeight / 2,
      duration: 1, ease: typeof CustomEase !== 'undefined' ? "hop" : "power2.out",
      onComplete: () => {
        expandedItem?.parentNode && document.body.removeChild(expandedItem);
        if (originalItem) {
          originalItem.style.visibility = "visible";
          gsap.set(originalItem, { scale: 1 });
        }
        titleSplit && titleSplit.revert();
        if (projectTitleElem) {
          projectTitleElem.textContent = '';
          projectTitleElem.style.fontSize = '1em';
          projectTitleElem.style.overflow = 'visible';
        }
        expandedItem = null; isExpanded = false; activeItem = null;
        originalPosition = null; activeItemId = null; canDrag = true;
        container.style.cursor = "grab";
        dragVelocityX = 0; dragVelocityY = 0; hoveredItem = null; isAnimatingTitle = false;
        waitingForMouseMove = true; panTargetX = 0; panTargetY = 0;
        lastMouseX = window.event?.clientX || 0;
        lastMouseY = window.event?.clientY || 0;
      }
    });
  });
}

/**
 * Main animation loop that updates the canvas position with smooth easing
 * and triggers updates to visible items when needed
 */
function animate() {
  if (canDrag) {
    const ease = 0.075;
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;

    const finalX = currentX + (isPanningFrozen ? frozenPanX : panCurrentX);
    const finalY = currentY + (isPanningFrozen ? frozenPanY : panCurrentY);
    // Use translate3d for better GPU acceleration
    canvas.style.transform = `translate3d(${finalX}px, ${finalY}px, 0)`;

    const now = Date.now();
    const distMoved = Math.sqrt((currentX - lastX) ** 2 + (currentY - lastY) ** 2);

    // Update more frequently to remove off-screen items faster
    if (distMoved > 80 || now - lastUpdateTime > 100) {
      updateVisibleItems();
      lastX = currentX;
      lastY = currentY;
      lastUpdateTime = now;
    }
  }
  requestAnimationFrame(animate);
}

initNavAnimation();
createInitialItems();
animate();

window.addEventListener("mousemove", handleMousePan);

container.addEventListener("mousedown", e => {
  if (!canDrag) return;
  isDragging = true;
  mouseHasMoved = false;
  startX = e.clientX;
  startY = e.clientY;
  container.style.cursor = "grabbing";
});

window.addEventListener("mousemove", e => {
  if (!isDragging || !canDrag) return;
  const dx = e.clientX - startX, dy = e.clientY - startY;
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) mouseHasMoved = true;
  const now = Date.now(), dt = Math.max(10, now - lastDragTime);
  lastDragTime = now;
  dragVelocityX = dx / dt;
  dragVelocityY = dy / dt;
  targetX += dx;
  targetY += dy;
  startX = e.clientX;
  startY = e.clientY;
});

window.addEventListener("mouseup", () => {
  if (!isDragging) return;
  isDragging = false;
  if (canDrag) {
    container.style.cursor = "grab";
    if (Math.abs(dragVelocityX) > 0.1 || Math.abs(dragVelocityY) > 0.1) {
      targetX += dragVelocityX * 200;
      targetY += dragVelocityY * 200;
    }
  }
});

container.addEventListener("touchstart", e => {
  if (!canDrag) return;
  isDragging = true;
  mouseHasMoved = false;
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  e.preventDefault();
});

window.addEventListener("touchmove", e => {
  if (!isDragging || !canDrag) return;
  const dx = e.touches[0].clientX - startX, dy = e.touches[0].clientY - startY;
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) mouseHasMoved = true;
  targetX += dx;
  targetY += dy;
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  e.preventDefault();
});

window.addEventListener("touchend", () => isDragging && (isDragging = false));

window.addEventListener("resize", () => {
  if (isExpanded && expandedItem && window.gsap) {
    const targetHeight = window.innerHeight * 0.7;
    gsap.to(expandedItem, {
      width: targetHeight * (itemWidth / itemHeight),
      height: targetHeight, duration: 0.3, ease: "power2.out"
    });
  } else updateVisibleItems();
});
