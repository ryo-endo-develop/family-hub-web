#!/usr/bin/env python
import asyncio
from app.scripts.setup_demo_data import setup_demo_data

if __name__ == "__main__":
    asyncio.run(setup_demo_data())
