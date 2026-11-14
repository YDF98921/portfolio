/* 交互：入场动画 / 阅读进度 / 导航高亮 / 项目悬停预览 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── 首屏名称上移动画 ───────────────────── */
  requestAnimationFrame(function () {
    document.body.classList.add("is-ready");
  });

  /* ── 滚动入场 ───────────────────────────── */
  var revealEls = document.querySelectorAll(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ── 顶部阅读进度 ───────────────────────── */
  var progressBar = document.getElementById("progressBar");

  function updateProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var ratio = max > 0 ? doc.scrollTop / max : 0;
    progressBar.style.transform = "scaleX(" + Math.min(ratio, 1) + ")";
  }

  /* ── 导航高亮 ───────────────────────────── */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".rail__nav a"));
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute("href")); })
    .filter(Boolean);

  function setActive(id) {
    navLinks.forEach(function (link) {
      link.classList.toggle("is-active", link.getAttribute("href") === "#" + id);
    });
  }

  if ("IntersectionObserver" in window && sections.length) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
    );
    sections.forEach(function (section) { sectionObserver.observe(section); });
  }

  var ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        updateProgress();
        ticking = false;
      });
    },
    { passive: true }
  );
  updateProgress();

  /* ── 项目悬停预览（仅精确指针设备） ──────── */
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var preview = document.getElementById("preview");
  var previewNo = document.getElementById("previewNo");
  var previewTitle = document.getElementById("previewTitle");

  if (finePointer && preview && !reduceMotion) {
    document.querySelectorAll(".work__item").forEach(function (item) {
      var titleEl = item.querySelector(".work__title");
      var name = titleEl ? titleEl.firstChild.textContent.trim() : "";
      var noEl = item.querySelector(".work__no");

      item.addEventListener("mouseenter", function () {
        preview.dataset.art = item.dataset.art || "1";
        previewNo.textContent = noEl ? noEl.textContent : "";
        previewTitle.textContent = name;
        preview.classList.add("is-on");
      });

      item.addEventListener("mousemove", function (event) {
        preview.style.left = event.clientX + "px";
        preview.style.top = event.clientY + "px";
      });

      item.addEventListener("mouseleave", function () {
        preview.classList.remove("is-on");
      });
    });
  }

  /* ── 主推短片 / 页面内全片播放 ─────────── */
  var featureVideo = document.getElementById("featureVideo");
  var featureDur = document.getElementById("featureDur");

  if (featureVideo) {
    var posterDone = false;
    var grabPoster = function () {
      if (posterDone || !featureVideo.videoWidth) return;
      try {
        var canvas = document.createElement("canvas");
        canvas.width = featureVideo.videoWidth;
        canvas.height = featureVideo.videoHeight;
        canvas
          .getContext("2d")
          .drawImage(featureVideo, 0, 0, canvas.width, canvas.height);
        featureVideo.poster = canvas.toDataURL("image/jpeg", 0.82);
        posterDone = true;
      } catch (e) {}
    };

    var startPreview = function () {
      if (reduceMotion) return;
      /* 静音、从片头播放，鼠标离开后继续播完整个短片（全片预览） */
      var attempt = featureVideo.play();
      if (attempt && attempt.catch) attempt.catch(function () {});
    };

    var setDuration = function () {
      var total = Math.round(featureVideo.duration || 0);
      if (total && featureDur) {
        featureDur.textContent =
          Math.floor(total / 60) + ":" + ("0" + (total % 60)).slice(-2);
      }
    };
    if (featureVideo.readyState >= 1) setDuration();
    else featureVideo.addEventListener("loadedmetadata", setDuration);

    /* 就绪后立即从开头静音播放全片（只触发一次） */
    var autoPlayed = false;
    var playFromStart = function () {
      if (autoPlayed || reduceMotion) return;
      autoPlayed = true;
      try {
        featureVideo.currentTime = 0;
      } catch (e) {}
      startPreview();
    };

    ["loadeddata", "canplay", "canplaythrough"].forEach(function (evt) {
      featureVideo.addEventListener(evt, playFromStart);
    });
    if (featureVideo.readyState >= 3) playFromStart();

    featureVideo.addEventListener("timeupdate", function () {
      if (!posterDone && featureVideo.currentTime > 0.4) grabPoster();
    });

    document.addEventListener("pointerdown", startPreview, { once: true });
  }

  /* ── 其他视频 / 进入视野后播放全片预览 ─── */
  var workVideos = document.querySelectorAll(".video-card video");
  if (workVideos.length && !reduceMotion) {
    if ("IntersectionObserver" in window) {
      var videoObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var video = entry.target;
            video.dataset.inView = entry.isIntersecting ? "true" : "false";
            if (entry.isIntersecting) {
              if (video.dataset.manualPause === "true") return;
              var attempt = video.play();
              if (attempt && attempt.catch) attempt.catch(function () {});
            } else {
              video.pause();
            }
          });
        },
        { threshold: 0.35 }
      );

      workVideos.forEach(function (video) {
        video.addEventListener("pause", function () {
          if (video.dataset.inView === "true" && !video.ended) {
            video.dataset.manualPause = "true";
          }
        });
        video.addEventListener("play", function () {
          video.dataset.manualPause = "false";
        });
        videoObserver.observe(video);
      });
    } else {
      workVideos.forEach(function (video) {
        var attempt = video.play();
        if (attempt && attempt.catch) attempt.catch(function () {});
      });
    }
  }

  /* ── 点击复制（微信号） ─────────────────── */
  Array.prototype.forEach.call(
    document.querySelectorAll("[data-copy]"),
    function (el) {
      el.addEventListener("click", function (event) {
        event.preventDefault();
        var text = el.getAttribute("data-copy");
        var label = el.getAttribute("data-label") || el.textContent;
        el.setAttribute("data-label", label);

        var flash = function () {
          el.textContent = "已复制：" + text;
          setTimeout(function () {
            el.textContent = label;
          }, 1600);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(flash, function () {});
        } else {
          flash();
        }
      });
    }
  );

  /* ── 年份 ───────────────────────────────── */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
