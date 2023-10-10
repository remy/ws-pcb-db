import Fuse from "https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.js";

/**
 * @typedef record
 * @property {string} front
 * @property {string} back
 * @property {string} pcb
 * @property {string} title
 * @property {string} board
 * @property {string} crc
 */

/** @type record[] */
const source = (await (await fetch("./data.json")).json()).map((_) => {
  const id = _.img;
  delete _.img;
  _.front = `WS_${id}_CF.webp`;
  _.back = `WS_${id}_CR.webp`;
  _.pcb = `WS_${id}_BF.webp`;
  return _;
});
const meta = await (await fetch("./ws-meta.json")).json();
let data = source;

const fuse = new Fuse(data, { keys: ["title", "board"] });

/** @type record */
let selected = {};

/** @returns {HTMLElement} */
const el = (tag, id, props = null) => {
  const el = document.createElement(tag);
  el.id = id;

  if (props !== null) {
    for (let [key, value] of Object.entries(props)) {
      el.setAttribute(key, value);
    }
  }

  return el;
};

/**
 * @param {string} s
 * @returns HTMLElement
 */
const $ = (s) => document.querySelector(s);

const $body = $("body");
const pcbTypes = [...new Set(data.map((_) => _.board))].sort();
const $board = el("select", "board");
$board.innerHTML = pcbTypes.map((_) => `<option>${_}</option>`);

const $titles = el("select", "title");
const $filter = el("input", "filter", {
  placeholder: "Filter titles",
  type: "text",
  list: "results",
});
const $meta = el("ul", "meta");
const $pcb = el("img", "pcb", { width: 800, height: 495, hidden: true });
const $pcbLink = el("a", "pcblink", { target: "_blank" });
const $imgWrapper = el("div", "imgs");
const $front = el("img", "front", { width: 800, height: 495, hidden: true });
const $related = el("ul", "related");
const $results = el("datalist", "results");

$imgWrapper.append($pcbLink);
$pcbLink.append($pcb);
$imgWrapper.append($front);

$body.append($filter);
$body.append($results);
$body.append($board);
$body.append($titles);
$body.append($imgWrapper);
$body.append($meta);
$body.append($related);

$body.addEventListener("change", eventHandler);
$body.addEventListener("input", eventHandler);

function eventHandler(event) {
  const value = event.target.value;

  if (event.target.id === "filter") {
    const filter = value.toLowerCase().trim();
    const results = fuse.search(filter);
    let data = source;
    if (filter === "") {
      data = source;
      $results.innerHTML = "";
    } else {
      data = results.map((_) => _.item);

      if (data.length > 1) {
        $results.innerHTML = data
          .map((_) => `<option>${_.title} (${_.board})</option>`)
          .join("");
      }

      // if we have an exact match - select that one
      selected = data.find(
        (_) => filter.toLowerCase() === `${_.title} (${_.board})`.toLowerCase()
      );
    }

    if (!selected && data.length > 1) {
      selected = data[0];
    }

    if (data.length > 0) {
      $board.value = selected.board;
      // selectTitle(selected);
      updateTitles(selected.board, selected);
    }
  }

  if (event.target.id === "title") {
    const [title, board] = value.split("^");
    selected = source.find((_) => {
      return title === _.title && board === _.board;
    });
    selectTitle(selected);
  }

  if (event.target.id === "board") {
    updateTitles(value);
  }
}

/**
 * @param {record} data */
function selectTitle(data) {
  selected = data;

  $pcbLink.href = data.pcb;
  $pcb.src = data.pcb;
  $front.src = data.front;

  const saves = { S: "SRAM", E: "EEPROM", "-": "none" };

  const metadata = [];
  if (meta[data.crc]) {
    metadata.push(...meta[data.crc]);
    if (!meta[data.crc].includes("2003 mapper")) {
      metadata.push("2001 mapper compat");
    }
  }

  metadata.push(data.board, saves[data.save], "crc " + data.crc);

  $meta.innerHTML = metadata.map((_) => `<li>${_}</li>`).join("");

  $related.innerHTML = source
    .filter((_) => _.board === selected.board)
    .sort(sortByTitle)
    .map((_) => `<li>${_.title} (${_.save})</li>`)
    .join("");
}

/**
 *
 * @param {string} board
 * @param {record} selected
 */
function updateTitles(board, selected = null) {
  const boards = data.filter((_) => board === _.board).sort(sortByTitle);

  $titles.innerHTML = boards
    .map(
      (_) =>
        `<option ${
          selected && selected.title === _.title ? "selected" : ""
        } value="${_.title}^${_.board}">${_.title} (${_.save})</option>`
    )
    // .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
    .join("");

  $pcb.hidden = false;
  $front.hidden = false;

  if (selected) {
    selectTitle(selected);
  } else {
    selectTitle(boards[0]);
  }
}

function sortByTitle(a, b) {
  return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1;
}
