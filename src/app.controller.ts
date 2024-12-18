// src/app.controller.ts

const { Controller, Get } = require("@nestjs/common");

@Controller("nest-route")
export class AppController {
  @Get()
  getHello() {
    return "Esta es una ruta de Nest.js";
  }
}
