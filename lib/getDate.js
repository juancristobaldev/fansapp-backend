function getDatetime() {
  const fecha = new Date().toISOString().slice(0, 19).replace("T", " ");

  return fecha;
}

module.exports = getDatetime;
