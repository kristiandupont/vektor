import React, { Component } from 'react';
import ReactJson from 'react-json-view';

class View extends Component {
  constructor(props) {
    super(props);
    this.state = {
      x: props.context.watches[props.watch].view.x,
      y: props.context.watches[props.watch].view.y,
      dragging: false
    };
    this.myRef = React.createRef();

    this.dragMouseDown = this.dragMouseDown.bind(this);
    this.dragMouseUp = this.dragMouseUp.bind(this);
    this.dragMouseMove = this.dragMouseMove.bind(this);
  }

  dragMouseDown(ev) {
    const r = this.myRef.current.getBoundingClientRect();
    const dragOffsetX = ev.clientX - r.left;
    const dragOffsetY = ev.clientY - r.top;
    this.setState({dragging: true, dragOffsetX, dragOffsetY});
    document.addEventListener('mousemove', this.dragMouseMove);
    document.addEventListener('mouseup', this.dragMouseUp);
    ev.preventDefault();
  }

  dragMouseUp(ev) {
    this.setState({dragging: false});
    document.removeEventListener('mousemove', this.dragMouseMove);
    document.removeEventListener('mouseup', this.dragMouseUp);
    ev.preventDefault();
  }

  dragMouseMove(ev) {
    if (!this.state.dragging) {
      return;
    }
    this.setState({
      x: ev.pageX - this.state.dragOffsetX,
      y: ev.pageY - this.state.dragOffsetY
    });
  }

  onEdit(ev) {
    this.props.onEdit(this.props.watch);
  }

  render() {
    const classes = ['box'];
    if (this.state.dragging) {
      classes.push('drag');
    }

    const style = {
      left: this.state.x,
      top: this.state.y
    }

    const watch = this.props.context.watches[this.props.watch];

    return (
      <div className={classes.join(' ')} style={style} ref={this.myRef}>
        <div className="header" onMouseDown={this.dragMouseDown}>
          {watch.view.header}
        </div>
        <div className="edit-button" onMouseDown={this.onEdit.bind(this)}>
          <i className="fa fa-edit"></i>
        </div>
          <ReactJson src={watch.lastEval} />
      </div>
    );
  }
}

export default View;
