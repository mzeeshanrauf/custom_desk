from setuptools import setup, find_packages

with open("requirements.txt") as f:
    install_requires = f.read().strip().split("\n")

setup(
    name="custom_desk",
    version="1.0.0",
    description="Custom Desk Theme for ERPNext v16 — replaces default desk with a clean, light, customizable dashboard",
    author="Your Company",
    author_email="admin@yourcompany.com",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=install_requires,
)
