function getDatetime() {
  const fechaHoraActual = new Date();
  const fechaFormateada = fechaHoraActual.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const horaFormateada = fechaHoraActual.toLocaleTimeString("es-ES", {
    hour12: false,
  });

  return `${fechaFormateada} ${horaFormateada}`;
}

module.exports = getDatetime;
