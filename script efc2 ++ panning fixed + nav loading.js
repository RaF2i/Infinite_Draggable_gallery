// Items array
const items = [
  "Silent Shadows",
  "Lonely Light",
  "Quiet Void",
  "Fading Contrast",
  "Empty Horizon",
  "Monochrome Silence",
  "Dark Whisper",
  "Pale Echo",
  "Stark Solitude",
  "Bleak Reflection",
  "Isolated Shade",
  "Muted Dusk",
  "Grey Emptiness",
  "Cold Absence",
  "Bare Twilight",
  "Still Dusk",
  "Vacant Gloom",
  "Quiet Eclipse",
  "Dim Silence",
  "Hollow Night"
];

// NAV ANIMATION - COMPLETELY SEPARATE FROM MAIN CODE
function initNavAnimation() {
  const nav = document.querySelector('nav');
  if (!nav) return;

  // Wait for both SplitType and GSAP to be available
  const checkLibraries = () => {
    if (typeof SplitType !== 'undefined' && typeof gsap !== 'undefined') {
      performNavAnimation(nav);
    } else {
      setTimeout(checkLibraries, 10);
    }
  };

  // Start checking immediately
  checkLibraries();
}

function performNavAnimation(nav) {
  // Store original text
  const originalText = nav.textContent;

  try {
    // Create SplitType instance for characters
    const navSplit = new SplitType(nav, {
      types: "chars",
      tagName: "span"
    });

    // Ensure each character span has proper styling
    navSplit.chars.forEach(char => {
      char.style.display = 'inline-block';
      char.style.willChange = 'transform';
    });

    // Set initial state - characters at bottom with opacity
    gsap.set(navSplit.chars, {
      y: "100%",
      opacity: 0
    });

    // Animate characters up from bottom with stagger
    gsap.to(navSplit.chars, {
      y: "0%",
      opacity: 1,
      duration: 0.5,
      stagger: 0.08,
      ease: "power3.out",
      delay: 0.2,
      force3D: true
    });

  } catch (error) {
    console.log('Nav animation fallback');
    // Fallback: simple fade in
    nav.style.opacity = '0';
    gsap.to(nav, {
      opacity: 1,
      duration: 1,
      delay: 0.2,
      ease: "power2.out"
    });
  }
}

// START IMMEDIATELY
const container = document.querySelector(".container") || document.body;
const canvas = document.querySelector(".canvas") || container;
const overlay = document.querySelector(".overlay");
const projectTitleElem = document.querySelector(".project-title p");

const itemCount = 20;
const itemGap = 150;
const columns = 4;
const itemWidth = 120;
const itemHeight = 160;

let isDragging = false;
let startX, startY;
let targetX = 0,
  targetY = 0;
let currentX = 0,
  currentY = 0;
let dragVelocityX = 0,
  dragVelocityY = 0;
let lastDragTime = 0;
let mouseHasMoved = false;
let visibleItems = new Set();
let lastUpdateTime = 0;
let lastX = 0,
  lastY = 0;
let isExpanded = false;
let activeItem = null;
let canDrag = true;
let originalPosition = null;
let expandedItem = null;
let activeItemId = null;
let titleSplit = null;
let isAnimatingTitle = false;
let hoveredItem = null;
let initialAnimationDone = false;
let initialVisibleItems = new Set();

// Mouse panning variables
let panTargetX = 0;
let panTargetY = 0;
let panCurrentX = 0;
let panCurrentY = 0;
let panActive = false;
let panAnimation = null;
const panStrength = 0.4;
const panRange = 250;

// NEW: Frozen panning variables
let frozenPanX = 0;
let frozenPanY = 0;
let isPanningFrozen = false;
let waitingForMouseMove = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Calculate initially visible items IMMEDIATELY
function getInitialVisibleItems() {
  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;
  const buffer = 1;

  const startCol = Math.floor(-viewWidth * buffer / (itemWidth + itemGap));
  const endCol = Math.ceil(viewWidth * buffer / (itemWidth + itemGap));
  const startRow = Math.floor(-viewHeight * buffer / (itemHeight + itemGap));
  const endRow = Math.ceil(viewHeight * buffer / (itemHeight + itemGap));

  const initialItems = new Set();

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      initialItems.add(`${col},${row}`);
    }
  }

  return initialItems;
}

// Create initial visible items INSTANTLY
function createInitialItems() {
  initialVisibleItems = getInitialVisibleItems();

  initialVisibleItems.forEach(itemId => {
    const [col, row] = itemId.split(',').map(Number);

    const item = document.createElement("div");
    item.className = "item";
    item.id = itemId;
    item.style.left = `${col * (itemWidth + itemGap)}px`;
    item.style.top = `${row * (itemHeight + itemGap)}px`;
    item.dataset.col = col;
    item.dataset.row = row;

    const itemNum = (Math.abs(row * columns + col) % itemCount) + 1;
    const img = document.createElement("img");
    img.src = `public/${itemNum}.jpeg`;
    img.alt = `Image ${itemNum}`;
    item.appendChild(img);

    // Set initial state immediately with rotateX
    item.style.opacity = '0';
    item.style.transform = 'translateY(64px) scale(1.5) rotateX(40deg)';
    item.style.transition = 'none';

    // Add event listeners
    item.addEventListener("mouseenter", (e) => {
      if (!canDrag || isDragging || isExpanded) return;
      hoveredItem = item;
      if (window.gsap) {
        gsap.to(item, {
          scale: 1.2,
          duration: 0.3,
          ease: "power2.out"
        });
      }
    });

    item.addEventListener("mouseleave", (e) => {
      if (!canDrag || isDragging || isExpanded) return;
      if (hoveredItem === item) {
        hoveredItem = null;
      }
      if (window.gsap) {
        gsap.to(item, {
          scale: 1,
          duration: 0.3,
          ease: "power2.out"
        });
      }
    });

    item.addEventListener("click", (e) => {
      if (mouseHasMoved || isDragging) return;
      handleItemClick(item);
    });

    canvas.appendChild(item);
    visibleItems.add(itemId);
  });
}

// Start loading animation for only visible items - MUCH faster trigger
function startLoadingAnimation() {
  // Immediate check with very short timeout
  if (typeof gsap === 'undefined') {
    const startTime = Date.now();
    const checkGsap = () => {
      if (typeof gsap !== 'undefined') {
        performLoadingAnimation();
      } else if (Date.now() - startTime < 200) {
        setTimeout(checkGsap, 1); // Check every 1ms for first 200ms
      } else {
        // Fallback after 200ms if GSAP still not loaded
        performLoadingAnimationFallback();
      }
    };
    checkGsap();
    return;
  }

  // If GSAP is available immediately, start animation right away
  performLoadingAnimation();
}

function performLoadingAnimation() {
  // Register plugins if available
  if (typeof gsap !== 'undefined' && typeof CustomEase !== 'undefined') {
    gsap.registerPlugin(CustomEase);
    CustomEase.create("hop", "0.9, 0, 0.1, 1");
  }

  const initialItems = Array.from(document.querySelectorAll('.item'));

  // Animate only the initially visible items with rotateX animation
  if (typeof gsap !== 'undefined') {
    gsap.to(initialItems, {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0, // Added rotateX animation from 40deg to 0deg
      duration: 1.3, // Individual animation duration set to 400ms
      stagger: 0.015, // Slightly reduced stagger for smoother flow
      ease: typeof CustomEase !== 'undefined' ? "hop" : "power2.out",
      onComplete: () => {
        initialAnimationDone = true;
      }
    });
  }
}

// Fallback animation without GSAP
function performLoadingAnimationFallback() {
  const initialItems = Array.from(document.querySelectorAll('.item'));

  initialItems.forEach((item, index) => {
    setTimeout(() => {
      item.style.transition = 'all 0.4s ease-out';
      item.style.opacity = '1';
      item.style.transform = 'translateY(0px) scale(1) rotateX(0deg)';
    }, index * 15);
  });

  setTimeout(() => {
    initialAnimationDone = true;
  }, initialItems.length * 15 + 400);
}

function setAndAnimateTitle(title) {
  if (!projectTitleElem) return;

  if (titleSplit) {
    titleSplit.revert();
  }
  projectTitleElem.textContent = title;
  projectTitleElem.style.fontSize = '2em';
  projectTitleElem.style.overflow = 'hidden';

  if (typeof SplitType !== 'undefined') {
    titleSplit = new SplitType(projectTitleElem, {
      types: "words"
    });
    if (window.gsap) {
      gsap.set(titleSplit.words, {
        y: "100%"
      });
    }
  }
}

function animateTitleIn() {
  if (isAnimatingTitle || !titleSplit || !window.gsap) return;
  isAnimatingTitle = true;

  gsap.to(titleSplit.words, {
    y: "0%",
    duration: 0.8,
    stagger: 0.08,
    ease: "power3.out",
    onComplete: () => {
      isAnimatingTitle = false;
    }
  });
}

function animateTitleOut(callback) {
  if (isAnimatingTitle || !titleSplit || !window.gsap) return;
  isAnimatingTitle = true;

  gsap.to(titleSplit.words, {
    y: "-100%",
    duration: 0.8,
    stagger: 0.08,
    ease: "power3.out",
    onComplete: () => {
      isAnimatingTitle = false;
      if (titleSplit) {
        titleSplit.revert();
      }
      if (projectTitleElem) {
        projectTitleElem.textContent = '';
        projectTitleElem.style.fontSize = '1em';
        projectTitleElem.style.overflow = 'visible';
      }
      if (callback) callback();
    }
  });
}

function handleMousePan(e) {
  const mouseX = e.clientX;
  const mouseY = e.clientY;

  // If we're waiting for mouse movement after closing expanded item
  if (waitingForMouseMove) {
    const mouseMoved = Math.abs(mouseX - lastMouseX) > 5 || Math.abs(mouseY - lastMouseY) > 5;
    if (mouseMoved) {
      waitingForMouseMove = false;
      isPanningFrozen = false;
      // Smoothly animate panCurrentX and panCurrentY to match the new panTargetX/Y
      // This makes the transition back to dynamic panning much smoother.
      if (window.gsap) {
        gsap.to(this, { // Use 'this' or a reference to an object if panCurrentX/Y are properties
          panCurrentX: (mouseX / window.innerWidth - 0.5) * panRange * panStrength,
          panCurrentY: (mouseY / window.innerHeight - 0.5) * panRange * panStrength,
          duration: 0.5, // Duration for the smooth transition
          ease: "power2.out",
          onUpdate: () => {
            // Update panTargetX/Y to the current mouse position during the transition
            panTargetX = (mouseX / window.innerWidth - 0.5) * panRange * panStrength;
            panTargetY = (mouseY / window.innerHeight - 0.5) * panRange * panStrength;
          }
        });
      } else {
        panCurrentX = (mouseX / window.innerWidth - 0.5) * panRange * panStrength;
        panCurrentY = (mouseY / window.innerHeight - 0.5) * panRange * panStrength;
      }
    } else {
      return;
    }
  }

  if (!canDrag || isDragging || isExpanded || isPanningFrozen) return;

  const xDecimal = mouseX / window.innerWidth;
  const yDecimal = mouseY / window.innerHeight;

  const panOffsetX = (xDecimal - 0.5) * panRange * panStrength;
  const panOffsetY = (yDecimal - 0.5) * panRange * panStrength;

  panTargetX = panOffsetX;
  panTargetY = panOffsetY;

  if (!panActive) {
    panActive = true;
    startPanAnimation();
  }
}

function startPanAnimation() {
  if (!window.gsap) return;

  if (panAnimation) {
    panAnimation.kill();
  }

  panAnimation = gsap.to({}, {
    duration: 2,
    ease: "power2.out",
    onUpdate: function() {
      if (!canDrag || isDragging || isExpanded || isPanningFrozen) return;

      const panEase = 0.08;
      panCurrentX += (panTargetX - panCurrentX) * panEase;
      panCurrentY += (panTargetY - panCurrentY) * panEase;
    },
    onComplete: () => {
      panActive = false;
    }
  });
}

function updateVisibleItems() {
  const buffer = 2.5;
  const viewWidth = window.innerWidth * (1 + buffer);
  const viewHeight = window.innerHeight * (1 + buffer);
  const movingRight = targetX > currentX;
  const movingDown = targetY > currentY;
  const directionBufferX = movingRight ? -300 : 300;
  const directionBufferY = movingDown ? -300 : 300;

  const startCol = Math.floor(
    (-currentX - viewWidth / 2 + (movingRight ? directionBufferX : 0)) /
    (itemWidth + itemGap)
  );

  const endCol = Math.ceil(
    (-currentX + viewWidth / 2 + (!movingRight ? directionBufferX : 0)) /
    (itemWidth + itemGap)
  );

  const startRow = Math.floor(
    (-currentY - viewHeight / 2 + (movingDown ? directionBufferY : 0)) /
    (itemHeight + itemGap)
  );

  const endRow = Math.ceil(
    (-currentY + viewHeight / 2 + (!movingDown ? directionBufferY : 0)) /
    (itemHeight + itemGap)
  );

  const currentItems = new Set();

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const itemId = `${col},${row}`;
      currentItems.add(itemId);

      if (visibleItems.has(itemId)) continue;
      if (activeItemId === itemId && isExpanded) continue;

      const item = document.createElement("div");
      item.className = "item";
      item.id = itemId;
      item.style.left = `${col * (itemWidth + itemGap)}px`;
      item.style.top = `${row * (itemHeight + itemGap)}px`;
      item.dataset.col = col;
      item.dataset.row = row;

      const itemNum = (Math.abs(row * columns + col) % itemCount) + 1;
      const img = document.createElement("img");
      img.src = `public/${itemNum}.jpeg`;
      img.alt = `Image ${itemNum}`;
      item.appendChild(img);

      // New items after initial load - animate in with rotateX and 400ms duration
      if (initialAnimationDone && window.gsap) {
        gsap.fromTo(item, {
          opacity: 0,
          y: 64,
          scale: 1.5,
          rotateX: 40
        }, {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          duration: 0.4, // 400ms duration for individual items
          ease: typeof CustomEase !== 'undefined' ? "hop" : "power2.out"
        });
      }

      item.addEventListener("mouseenter", (e) => {
        if (!canDrag || isDragging || isExpanded) return;
        hoveredItem = item;
        if (window.gsap) {
          gsap.to(item, {
            scale: 1.2,
            duration: 0.3,
            ease: "power2.out"
          });
        }
      });

      item.addEventListener("mouseleave", (e) => {
        if (!canDrag || isDragging || isExpanded) return;
        if (hoveredItem === item) {
          hoveredItem = null;
        }
        if (window.gsap) {
          gsap.to(item, {
            scale: 1,
            duration: 0.3,
            ease: "power2.out"
          });
        }
      });

      item.addEventListener("click", (e) => {
        if (mouseHasMoved || isDragging) return;
        handleItemClick(item);
      });

      canvas.appendChild(item);
      visibleItems.add(itemId);
    }
  }

  visibleItems.forEach((itemId) => {
    if (!currentItems.has(itemId) || (activeItemId === itemId && isExpanded)) {
      const item = document.getElementById(itemId);
      if (item && canvas.contains(item)) {
        canvas.removeChild(item);
      }
      visibleItems.delete(itemId);
    }
  });
}

function handleItemClick(item) {
  if (isExpanded) {
    if (expandedItem) closeExpandedItem();
  } else {
    expandItem(item);
  }
}

function expandItem(item) {
  if (!window.gsap) return;

  isExpanded = true;
  activeItem = item;
  activeItemId = item.id;
  canDrag = false;
  container.style.cursor = "auto";

  // Freeze panning values at current state and store mouse position
  frozenPanX = panCurrentX;
  frozenPanY = panCurrentY;
  isPanningFrozen = true;
  lastMouseX = window.event ? window.event.clientX || 0 : 0;
  lastMouseY = window.event ? window.event.clientY || 0 : 0;

  // Reset panning targets (but keep current values frozen)
  panTargetX = 0;
  panTargetY = 0;
  if (panAnimation) {
    panAnimation.kill();
    panActive = false;
  }

  const imgSrc = item.querySelector("img").src;
  const imgMatch = imgSrc.match(/\/(\d+)\.jpeg/);
  const imgNum = imgMatch ? parseInt(imgMatch[1]) : 1;
  const titleIndex = (imgNum - 1) % items.length;

  setAndAnimateTitle(items[titleIndex]);
  item.style.visibility = "hidden";

  const rect = item.getBoundingClientRect();
  const targetImg = item.querySelector("img").src;

  const itemLeft = parseFloat(item.style.left);
  const itemTop = parseFloat(item.style.top);

  originalPosition = {
    id: item.id,
    rect: rect,
    imgSrc: targetImg,
    originalScale: hoveredItem === item ? 1.2 : 1,
    originalLeft: itemLeft,
    originalTop: itemTop
  };

  if (overlay) overlay.classList.add("active");

  expandedItem = document.createElement("div");
  expandedItem.className = "expanded-item";
  expandedItem.style.width = `${itemWidth}px`;
  expandedItem.style.height = `${itemHeight}px`;

  const img = document.createElement("img");
  img.src = targetImg;
  expandedItem.appendChild(img);
  expandedItem.addEventListener("click", closeExpandedItem);
  document.body.appendChild(expandedItem);

  document.querySelectorAll(".item").forEach((el) => {
    if (el !== activeItem) {
      gsap.to(el, {
        opacity: 0,
        filter: "blur(5px)",
        duration: 0.3,
        ease: "power2.out",
      });
    }
  });

  const viewportHeight = window.innerHeight;
  const targetHeight = viewportHeight * 0.85;
  const aspectRatio = itemWidth / itemHeight;
  const targetWidth = targetHeight * aspectRatio;

  const startScale = originalPosition.originalScale;

  gsap.fromTo(
    expandedItem, {
      width: itemWidth * startScale,
      height: itemHeight * startScale,
      x: rect.left + (itemWidth * startScale) / 2 - window.innerWidth / 2,
      y: rect.top + (itemHeight * startScale) / 2 - window.innerHeight / 2,
    }, {
      width: targetWidth,
      height: targetHeight,
      x: 0,
      y: 0,
      duration: 1,
      ease: typeof CustomEase !== 'undefined' ? "hop" : "power2.out",
    }
  );

  gsap.delayedCall(0.5, animateTitleIn);
}

function closeExpandedItem() {
  if (!expandedItem || !originalPosition || !window.gsap) return;

  animateTitleOut(() => {});

  gsap.delayedCall(0.3, () => {
    if (overlay) overlay.classList.remove("active");

    const canvasTransform = canvas.style.transform;
    const transformMatch = canvasTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    const canvasX = transformMatch ? parseFloat(transformMatch[1]) : 0;
    const canvasY = transformMatch ? parseFloat(transformMatch[2]) : 0;

    const screenX = originalPosition.originalLeft + canvasX + itemWidth / 2;
    const screenY = originalPosition.originalTop + canvasY + itemHeight / 2;

    document.querySelectorAll(".item").forEach((el) => {
      if (el.id !== activeItemId) {
        gsap.to(el, {
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.3,
          ease: "power2.out",
        });
      }
    });

    const originalItem = document.getElementById(activeItemId);

    gsap.to(expandedItem, {
      width: itemWidth,
      height: itemHeight,
      x: screenX - window.innerWidth / 2,
      y: screenY - window.innerHeight / 2,
      duration: 1,
      ease: typeof CustomEase !== 'undefined' ? "hop" : "power2.out",
      onComplete: () => {
        if (expandedItem && expandedItem.parentNode) {
          document.body.removeChild(expandedItem);
        }

        if (originalItem) {
          originalItem.style.visibility = "visible";
          gsap.set(originalItem, {
            scale: 1
          });
        }

        if (titleSplit) {
          titleSplit.revert();
        }
        if (projectTitleElem) {
          projectTitleElem.textContent = '';
          projectTitleElem.style.fontSize = '1em';
          projectTitleElem.style.overflow = 'visible';
        }

        expandedItem = null;
        isExpanded = false;
        activeItem = null;
        originalPosition = null;
        activeItemId = null;
        canDrag = true;
        container.style.cursor = "grab";
        dragVelocityX = 0;
        dragVelocityY = 0;
        hoveredItem = null;
        isAnimatingTitle = false;

        // Set up for smooth panning reactivation
        waitingForMouseMove = true;
        panTargetX = 0;
        panTargetY = 0;
        // Update lastMouseX/Y to current mouse position to prevent immediate unfreeze if mouse is still
        lastMouseX = window.event ? window.event.clientX || 0 : 0;
        lastMouseY = window.event ? window.event.clientY || 0 : 0;
      },
    });
  });
}

function animate() {
  if (canDrag) {
    const ease = 0.075;
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;

    // Use frozen panning values when panning is frozen
    const finalX = currentX + (isPanningFrozen ? frozenPanX : panCurrentX);
    const finalY = currentY + (isPanningFrozen ? frozenPanY : panCurrentY);

    canvas.style.transform = `translate(${finalX}px, ${finalY}px)`;

    const now = Date.now();
    const distMoved = Math.sqrt(
      Math.pow(currentX - lastX, 2) + Math.pow(currentY - lastY, 2)
    );

    if (distMoved > 100 || now - lastUpdateTime > 120) {
      updateVisibleItems();
      lastX = currentX;
      lastY = currentY;
      lastUpdateTime = now;
    }
  }

  requestAnimationFrame(animate);
}

// Start nav animation immediately
initNavAnimation();

// INITIALIZE EVERYTHING IMMEDIATELY
createInitialItems(); // Create items instantly
startLoadingAnimation(); // Start animation as soon as possible (within 200ms)
animate(); // Start the animation loop

// Event listeners
window.addEventListener("mousemove", handleMousePan);

container.addEventListener("mousedown", (e) => {
  if (!canDrag) return;
  isDragging = true;
  mouseHasMoved = false;
  startX = e.clientX;
  startY = e.clientY;
  container.style.cursor = "grabbing";
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging || !canDrag) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
    mouseHasMoved = true;
  }

  const now = Date.now();
  const dt = Math.max(10, now - lastDragTime);
  lastDragTime = now;

  dragVelocityX = dx / dt;
  dragVelocityY = dy / dt;

  targetX += dx;
  targetY += dy;

  startX = e.clientX;
  startY = e.clientY;
});

window.addEventListener("mouseup", (e) => {
  if (!isDragging) return;
  isDragging = false;

  if (canDrag) {
    container.style.cursor = "grab";

    if (Math.abs(dragVelocityX) > 0.1 || Math.abs(dragVelocityY) > 0.1) {
      const momentumFactor = 200;
      targetX += dragVelocityX * momentumFactor;
      targetY += dragVelocityY * momentumFactor;
    }
  }
});

container.addEventListener("touchstart", (e) => {
  if (!canDrag) return;
  isDragging = true;
  mouseHasMoved = false;
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  e.preventDefault();
});

window.addEventListener("touchmove", (e) => {
  if (!isDragging || !canDrag) return;

  const dx = e.touches[0].clientX - startX;
  const dy = e.touches[0].clientY - startY;

  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
    mouseHasMoved = true;
  }

  targetX += dx;
  targetY += dy;

  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  e.preventDefault();
});

window.addEventListener("touchend", () => {
  if (isDragging) {
    isDragging = false;
  }
});

window.addEventListener("resize", () => {
  if (isExpanded && expandedItem && window.gsap) {
    const viewportHeight = window.innerHeight;
    const targetHeight = viewportHeight * 0.7;
    const aspectRatio = itemWidth / itemHeight;
    const targetWidth = targetHeight * aspectRatio;

    gsap.to(expandedItem, {
      width: targetWidth,
      height: targetHeight,
      duration: 0.3,
      ease: "power2.out",
    });
  } else {
    updateVisibleItems();
  }
});