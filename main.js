Handlebars.registerHelper("generateIdFromCategoryTitle", function (title) {
  return title.replace(/\s/g, "-").toLowerCase();
});
Handlebars.registerHelper("getImdbId", function (url) {
  const match = url.match(/\/(title|name)\/(tt\d+|nm\d+)/i);
  return match ? match[2] : null;
});
document.addEventListener("DOMContentLoaded", async () => {
  const response = await fetch("./awards.json");
  const data = await response.json();
  const templateSource = document.querySelector("template").innerHTML;
  const template = Handlebars.compile(templateSource);
  const compiledHtml = template(data);
  document.body.insertAdjacentHTML("beforeend", compiledHtml);
  document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    const savedState = localStorage.getItem(checkbox.id);
    if (savedState !== null) {
      checkbox.checked = JSON.parse(savedState);
    }
    calcWatchedMovies();
    calcWatchedMoviesPerCategory();
    checkbox.addEventListener("change", () => {
      localStorage.setItem(checkbox.id, JSON.stringify(checkbox.checked));
      setCheckboxOfSameMovie(checkbox.dataset.movieId, checkbox.checked);
      calcWatchedMovies();
      calcWatchedMoviesPerCategory();
    });
  });
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    const savedState = localStorage.getItem(radio.name);
    if (savedState !== null) {
      radio.checked = radio.value === savedState;
    }
    radio.addEventListener("change", (el) => {
      if (radio.checked) {
        localStorage.setItem(radio.name, radio.value);
      }
      const winnerSelect = radio.closest(".award").querySelector("select[data-category]");
      if (winnerSelect) highlightWinner(winnerSelect);
      renderPredictions();
    });
  });
  document.querySelectorAll("select[data-category]").forEach((select) => {
    const savedWinner = localStorage.getItem("winner-" + select.dataset.category);
    if (savedWinner) {
      select.value = savedWinner;
      highlightWinner(select);
    }
    select.addEventListener("change", () => {
      localStorage.setItem("winner-" + select.dataset.category, select.value);
      highlightWinner(select);
      renderPredictions();
    });
  });
  renderPredictions();
});
function setCheckboxOfSameMovie(movieId, checked) {
  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
  checkboxes.forEach((checkbox) => {
    if (checkbox.dataset.movieId === movieId) {
      if (checkbox.checked !== checked) {
        checkbox.checked = checked;
        localStorage.setItem(checkbox.id, JSON.stringify(checked));
      }
    }
  });
}
function calcWatchedMovies() {
  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
  const watchedMovies = checkboxes.filter((checkbox) => checkbox.checked);
  const totalWatchedMovies = watchedMovies.length;
  const totalMovies = checkboxes.length;
  const percentage = Math.round((totalWatchedMovies / totalMovies) * 100);
  const watchedPercentage = `${totalWatchedMovies} / ${totalMovies} (${percentage}%)`;
  document.querySelector("#watchedPercentage").textContent = watchedPercentage;
}
function calcWatchedMoviesPerCategory() {
  const categories = Array.from(document.querySelectorAll(".award"));
  categories.forEach((category) => {
    const checkboxes = Array.from(category.querySelectorAll('input[type="checkbox"]'));
    const watchedMovies = checkboxes.filter((checkbox) => checkbox.checked);
    const totalWatchedMovies = watchedMovies.length;
    const totalMovies = checkboxes.length;
    const percentage = Math.round((totalWatchedMovies / totalMovies) * 100);
    const watchedPercentage = `${totalWatchedMovies} / ${totalMovies} (${percentage}%)`;
    category.querySelector(".watchedPercentage").textContent = watchedPercentage;
  });
}
function highlightWinner(select) {
  const award = select.closest(".award");
  award.querySelectorAll("figure").forEach((fig) => {
    fig.classList.remove("winner");
    fig.classList.remove("failed-prediction");
  });
  if (select.value) {
    const winnerRadio = award.querySelector(`input[type="radio"][value="${select.value}"]`);
    if (winnerRadio) {
      winnerRadio.closest("figure").classList.add("winner");
    }
    const checkedRadio = award.querySelector('input[type="radio"]:checked');
    if (checkedRadio && checkedRadio.value !== select.value) {
      checkedRadio.closest("figure").classList.add("failed-prediction");
    }
  }
}
function renderPredictions() {
  const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
  const checkedRadios = radios.filter((radio) => radio.checked);
  const items = checkedRadios.map((radio) => {
    const award = radio.closest(".award");
    const category = award.querySelector("h2").innerText;
    const title = radio.closest("figure").querySelector("h3").innerText;
    const winnerSelect = award.querySelector("select[data-category]");
    const winnerId = winnerSelect ? winnerSelect.value : "";
    let status = "";
    let cssClass = "";
    if (winnerId) {
      const winnerName = winnerSelect.options[winnerSelect.selectedIndex].text;
      if (radio.value === winnerId) {
        status = " ✅ Correct!";
        cssClass = "correct";
      } else {
        status = ` ❌ Winner: ${winnerName}`;
        cssClass = "wrong";
      }
    }
    return `<li class="${cssClass}">🎬 ${category}: 🏆 ${title}${status}</li>`;
  });
  const list = items.length ? `<ul>${items.join("")}</ul>` : "<p>No predictions yet.</p>";
  document.querySelector("#predictionsList").innerHTML = list;
}
function sharePredictions() {
  const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
  const checkedRadios = radios.filter((radio) => radio.checked);
  let correctCount = 0;
  let totalWithWinner = 0;
  const nominees = checkedRadios.map((radio) => {
    const award = radio.closest(".award");
    const category = award.querySelector("h2").innerText;
    const title = radio.closest("figure").querySelector("h3").innerText;
    const winnerSelect = award.querySelector("select[data-category]");
    const winnerId = winnerSelect ? winnerSelect.value : "";
    let status = "";
    if (winnerId) {
      totalWithWinner++;
      const winnerName = winnerSelect.options[winnerSelect.selectedIndex].text;
      if (radio.value === winnerId) {
        correctCount++;
        status = "\r\n✅ Correct!";
      } else {
        status = `\r\n❌ Winner: ${winnerName}`;
      }
    }
    return `🎬 ${category}: \r\n🏆 ${title}${status}`;
  });

  const score = totalWithWinner ? `\r\nScore: ${correctCount}/${totalWithWinner}` : "";
  const text = `My 2026 Oscars predictions:\r\n${nominees.join("\r\n")}${score}`;
  if (navigator.share) {
    navigator.share({ text });
  } else {
    console.log(text);
  }
}
