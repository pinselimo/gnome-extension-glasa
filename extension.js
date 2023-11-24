'use strict';

const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const { Clutter, GLib, Gio, St } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

class Extension {
  constructor() {
    this._indicator = null;
  }

  enable() {
    // log(`enabling ${Me.metadata.name}`);

    // Retrieve the extension's settings and make changing them update the
    // extension indicator.
    this._settings = ExtensionUtils.getSettings();
    this._settings_handler = null;
    this._settings_handler = this._settings.connect('changed', () => {
      this._position_changed();
      this._popupmenu_created();
    });

    // Provide the drawing function for the indicator icon.
    let size = Panel.PANEL_ICON_SIZE;
    this._icon = new St.DrawingArea({ width: 3 * size, height: size });
    this._repaint_handler = null;
    this._repaint_handler = this._icon.connect('repaint', () => {
      this._draw_eyes();
    });

    // Repaint the eyes after a short time period by using the main loop.
    this._update_handler = null;
    this._update_handler = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
      this._icon.queue_repaint();
      return GLib.SOURCE_CONTINUE;
    });

    // Set up the indicator itself.
    let indicatorName = `${Me.metadata.name} Indicator`;
    this._indicator = new PanelMenu.Button(0.0, indicatorName, false);

    // The icon should be correctly styled and aligned.
    let hbox = new St.BoxLayout({ style_class: 'system-status-icon' });
    hbox.add_child(this._icon);
    this._indicator.add_child(hbox);
    this._icon.queue_repaint();

    // Initially, add the indicator to the status area.
    // Afterwards, the position will be correctly determined.
    // This could be done in a better way.
    Main.panel.addToStatusArea(indicatorName, this._indicator);
    this._position_changed();
    this._popupmenu_created();
  }

  _position_changed() {
    this._indicator.get_parent().remove_actor(this._indicator);
    let boxes = {
      0: Main.panel._leftBox,
      1: Main.panel._centerBox,
      2: Main.panel._rightBox,
    };
    let p = this._settings.get_int('panel-box');
    let q = this._settings.get_int('panel-box-location');
    boxes[p].insert_child_at_index(this._indicator, q);
  }

  _popupmenu_created() {
    this._indicator.menu.removeAll();
    this._indicator.menu.addAction(
      this._settings.get_string('panel-message'),
      () => {}
    );
    this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this._indicator.menu.addAction(
      'Settings',
      () => { this._open_preferences() }
    );
  }

  _open_preferences() {
    // I have copied this command from another extension
    // (Arch-Linux Update Indicator)
    Gio.DBus.session.call(
      'org.gnome.Shell.Extensions', '/org/gnome/Shell/Extensions',
      'org.gnome.Shell.Extensions', 'OpenExtensionPrefs',
      new GLib.Variant('(ssa{sv})', [Me.uuid, '', {}]), null,
      Gio.DBusCallFlags.NONE, -1, null);
  }

  _draw_eye(position) {
    let halfsize = this._icon.height / 2;
    let halfwidth = this._icon.width / 2;
    let [area_x, area_y] = this._icon.get_transformed_position();
    let [mouse_x, mouse_y, mask] = global.get_pointer();
    let rect = global.display.get_monitor_geometry(global.display.get_primary_monitor());
    let geo_width = rect.width;
    let geo_height = rect.height;

    const EYE_LINE_WIDTH = 1.5;
    const RELIEF_FACTOR = 2;
    const RELIEF_FACTOR_BOUND = 0.7;
    const IRIS_MOVE = 0.66;
    const IRIS_SIZE = 0.5;
    const EYEBROW_SCALE = 1.4;
    const VARIABLE_RELIEF = 15;
    const CROSS_EYE_SLOPE = 0.4;

    let eye_radius = 2 * halfsize / (1 + EYEBROW_SCALE);
    let eyebrow_radius = EYEBROW_SCALE * eye_radius;
    eye_radius -= EYE_LINE_WIDTH / 2;
    eyebrow_radius -= EYE_LINE_WIDTH / 2;
    let center_y = halfsize * (EYEBROW_SCALE + 1) / 2;
    let center_x = halfwidth + position * eye_radius;

    mouse_x -= area_x + center_x;
    mouse_y -= area_y + center_y;

    let maxMouseDist_y = geo_height - (area_y + center_y);
    let maxMouseDist_x = area_x + center_x  > geo_width/2 ?
      area_x + center_x  : geo_width-(area_x + center_x);

    let maxMouseDist = Math.sqrt(maxMouseDist_x * maxMouseDist_x +
      maxMouseDist_y * maxMouseDist_y);

    let mouse_distance = Math.sqrt(mouse_x * mouse_x + mouse_y * mouse_y);
    let factor = mouse_distance / ((RELIEF_FACTOR + VARIABLE_RELIEF *
      Math.pow(mouse_distance/maxMouseDist, CROSS_EYE_SLOPE)) * eye_radius);
    if (factor > RELIEF_FACTOR_BOUND) factor = RELIEF_FACTOR_BOUND;
    let iris_move = eye_radius * IRIS_MOVE * factor;

    // Get and set up the Cairo context.
    let cr = this._icon.get_context();
    let theme_node = this._icon.get_theme_node();
    Clutter.cairo_set_source_color(cr, theme_node.get_foreground_color());

    cr.setLineWidth(EYE_LINE_WIDTH);
    cr.save();

    // Draw the eye.
    cr.translate(center_x, center_y);
    cr.arc(0, 0, eye_radius, 0, 2 * Math.PI);
    cr.stroke();
    // Draw the eyebrow.
    let offset = position > 0 ? 0.5 : 0.0;
    cr.arc(0, 0, eyebrow_radius, (5 + offset) * Math.PI / 4,
      (6.5 + offset) * Math.PI / 4);
    cr.stroke();
    // Draw the iris/pupil.
    cr.rotate(Math.PI / 2 - Math.atan2(mouse_x, mouse_y));
    cr.translate(iris_move, 0);
    cr.scale(Math.cos(factor), 1);
    cr.arc(0, 0, eye_radius * IRIS_SIZE, 0, 2 * Math.PI);
    cr.fill();
    cr.restore();
  }

  _draw_eyes() {
    this._draw_eye(-1); // Draw left eye
    this._draw_eye( 1); // Draw right eye
  }

  disable() {
    // log(`disabling ${Me.metadata.name}`);
    if (this._settings_handler) {
      this._settings.disconnect(this._settings_handler);
      this._settings_handler = null;
    }

    if (this._update_handler) {
      GLib.Source.remove(this._update_handler);
      this._update_handler = null;
    }

    if (this._repaint_handler) {
      this._icon.disconnect(this._repaint_handler);
      this._repaint_handler = null;
    }

    // Destroy indicator and icon.
    this._indicator.destroy();
    // Reset.
    this._indicator = null;
    this._icon = null;
    this._settings = null;
  }
}

function init() {
  // log(`initializing ${Me.metadata.name}`);
  return new Extension();
}
