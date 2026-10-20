from contextvars import ContextVar

actor: ContextVar[str] = ContextVar("mtools_actor", default="ui:test")
