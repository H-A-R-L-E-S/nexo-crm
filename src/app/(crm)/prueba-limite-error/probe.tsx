"use client";

import { Component } from "react";

let pendingFailure = true;

export class ErrorProbe extends Component<object, { crash: boolean }> {
  state = { crash: false };

  componentDidMount() {
    if (pendingFailure) {
      pendingFailure = false;
      setTimeout(() => this.setState({ crash: true }), 0);
    }
  }

  render() {
    if (this.state.crash) throw new Error("E2E_SECRET_SHOULD_NOT_BE_VISIBLE");
    return pendingFailure ? <p role="status">Preparando fallo controlado</p> : <h1>Recuperación completada</h1>;
  }
}
