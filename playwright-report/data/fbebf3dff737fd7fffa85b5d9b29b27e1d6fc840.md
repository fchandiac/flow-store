# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - img "Logo" [ref=e5]
      - heading "Iniciar Sesión" [level=1] [ref=e6]
      - generic [ref=e7]:
        - generic [ref=e9]:
          - generic [ref=e13]:
            - textbox [ref=e15]
            - generic: Usuario*
            - generic: Usuario*
          - generic [ref=e19]:
            - generic [ref=e20]:
              - textbox [ref=e21]
              - button "Mostrar contraseña" [ref=e22] [cursor=pointer]:
                - generic [ref=e23]: visibility
            - generic: Contraseña*
            - generic: Contraseña*
        - button "Ingresar" [ref=e26] [cursor=pointer]:
          - generic [ref=e28]: Ingresar
    - button "Editar configuración de BD" [ref=e29] [cursor=pointer]:
      - generic [ref=e30]: settings
  - alert [ref=e31]
  - button "Open Next.js Dev Tools" [ref=e37] [cursor=pointer]:
    - img [ref=e38]
```