{
  description = "Flake for gnome extension building";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
      lib = pkgs.lib;

      uuid = "glasa@lyrahgames.github.io";
      pname = "glasa";
      description = "This extension puts an icon in the panel consisting of two comic-like eyes following the cursor.";
      link = "https://extensions.gnome.org/extension/4780/glasa/";
      version = 11;
    in {
      packages.default = pkgs.stdenv.mkDerivation {
        pname = "gnome-shell-extension-${pname}";
        version = builtins.toString version;
        src = ./.;
        nativeBuildInputs = with pkgs; [ buildPackages.glib ];
        buildPhase = ''
          runHook preBuild
          if [ -d schemas ]; then
            glib-compile-schemas --strict schemas
          fi
          runHook postBuild
        '';
        installPhase = ''
          runHook preInstall
          mkdir -p $out/share/gnome-shell/extensions/
          cp -r -T . $out/share/gnome-shell/extensions/${uuid}
          runHook postInstall
        '';
        meta = {
          description = builtins.head (lib.splitString "\n" description);
          longDescription = description;
          homepage = link;
          license = lib.licenses.gpl2Plus; # https://wiki.gnome.org/Projects/GnomeShell/Extensions/Review#Licensing
          maintainers = with lib.maintainers; [ piegames ];
        };
        passthru = {
          extensionPortalSlug = pname;
          # Store the extension's UUID, because we might need it at some places
          extensionUuid = uuid;
        };
      };
  });
}
