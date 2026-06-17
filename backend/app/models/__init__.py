"""ORM models package.

Avoid eager imports here so lightweight service modules can import enum
definitions without initializing the database engine.
"""
