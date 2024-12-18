const { Module } = require("@nestjs/common");
const { AppController } = require("./app.controller");

@Module({
  controllers: [AppController],
})
export class AppModule {}
